import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// WebSocket connections stored by evaluation ID
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wsClients = new Map<string, Set<any>>();

// Broadcast to all clients subscribed to an evaluation ID
function broadcast(evalId: string, data: Record<string, unknown>) {
  const clients = wsClients.get(evalId);
  if (!clients) return;
  const message = JSON.stringify(data);
  for (const ws of clients) {
    try {
      ws.send(message);
    } catch {
      clients.delete(ws);
    }
  }
  if (clients.size === 0) wsClients.delete(evalId);
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true);

    // WebSocket upgrade for /ws/evaluate
    if (parsedUrl.pathname === '/ws/evaluate' && req.headers.upgrade?.toLowerCase() === 'websocket') {
      const evalId = (parsedUrl.query.id as string) || crypto.randomUUID();
      const { WebSocketServer } = await import('ws');
      const wss = new WebSocketServer({ noServer: true });

      wss.on('connection', (ws) => {
        if (!wsClients.has(evalId)) wsClients.set(evalId, new Set());
        wsClients.get(evalId)!.add(ws);

        ws.send(JSON.stringify({ type: 'connected', evalId }));

        ws.on('close', () => {
          const clients = wsClients.get(evalId);
          if (clients) {
            clients.delete(ws);
            if (clients.size === 0) wsClients.delete(evalId);
          }
        });

        ws.on('error', () => {
          const clients = wsClients.get(evalId);
          if (clients) clients.delete(ws);
        });
      });

      // Handle upgrade manually
      const head = Buffer.alloc(0);
      wss.handleUpgrade(req, req.socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });

      return;
    }

    // Handle all other routes with Next.js
    handle(req, res, parsedUrl);
  });

  // Also handle the upgrade event on the raw server
  server.on('upgrade', (req, socket, head) => {
    const parsedUrl = parse(req.url!, true);
    if (parsedUrl.pathname === '/ws/evaluate') {
      // Already handled above via wss.handleUpgrade
    } else {
      socket.destroy();
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket available at ws://${hostname}:${port}/ws/evaluate`);
  });
});

// Export broadcast for use in API routes via globalThis
declare global {
  var broadcastEvaluation: ((evalId: string, data: Record<string, unknown>) => void) | undefined;
}

if (typeof globalThis !== 'undefined') {
  globalThis.broadcastEvaluation = broadcast;
}
