interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const STORAGE_KEY = 'arc_wallet_address';

function getProvider(): EthereumProvider {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected. Please install MetaMask browser extension.');
  }
  return window.ethereum;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

export function getSavedAddress(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function clearSavedAddress(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

function saveAddress(address: string): void {
  localStorage.setItem(STORAGE_KEY, address);
}

export async function connectWallet(): Promise<{ address: string; shortAddress: string }> {
  const provider = getProvider();

  let accounts: string[];
  try {
    const result = await provider.request({ method: 'eth_requestAccounts' });
    accounts = result as string[];
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err) {
      const errorCode = (err as { code: number }).code;
      if (errorCode === 4001) {
        throw new Error('Connection rejected. Please approve the connection request in MetaMask.');
      }
    }
    throw new Error('Failed to connect wallet. Please try again.');
  }

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found in MetaMask. Please unlock your wallet and try again.');
  }

  const address = accounts[0].toLowerCase();
  saveAddress(address);

  return { address, shortAddress: shortenAddress(address) };
}

export async function getChainId(): Promise<number | null> {
  if (!isWalletAvailable()) return null;

  try {
    const chainIdHex = await getProvider().request({ method: 'eth_chainId' });
    return parseInt(chainIdHex as string, 16);
  } catch {
    return null;
  }
}

export const ARC_CHAIN_ID = 5042002;
export const ARC_CHAIN_ID_HEX = '0x4CE992';

export function isCorrectChain(chainId: number): boolean {
  return chainId === ARC_CHAIN_ID;
}

export function generateSiweMessage(address: string): string {
  const nonce = Math.random().toString(36).substring(2, 15);
  const timestamp = new Date().toISOString();
  return (
    `Arc Task Verifier Bot wants you to sign in with your wallet.\n` +
    `Address: ${address}\n` +
    `Nonce: ${nonce}\n` +
    `Timestamp: ${timestamp}\n` +
    `This request will not trigger any blockchain transaction or cost any gas fees.`
  );
}

export async function signMessage(address: string, message: string): Promise<string> {
  const provider = getProvider();

  try {
    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, address],
    });
    return signature as string;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err) {
      const errorCode = (err as { code: number }).code;
      if (errorCode === 4001) {
        throw new Error('Signature rejected. Signing is required to authenticate.');
      }
    }
    throw new Error('Failed to sign message. Please try again.');
  }
}

export function disconnectWallet(): void {
  clearSavedAddress();
}
