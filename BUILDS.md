# Arc Task Verifier Bot - Build Instructions

## Prerequisites
- Node.js 18+
- GitHub Personal Access Token
- OpenAI API Key
- Foundry (for smart contract testing)

## Project Structure
```
arc-task-verifier/
├── app/
│   ├── api/
│   ├── components/
│   └── lib/
├── public/
└── package.json
```

## Installation Steps

1. Initialize Next.js project:
```bash
npx create-next-app arc-task-verifier
cd arc-task-verifier
```

2. Install dependencies:
```bash
npm install openai axios dotenv
```

3. Create environment file:
```bash
echo "OPENAI_API_KEY=your_key_here" > .env.local
echo "GITHUB_TOKEN=your_token_here" >> .env.local
```

4. Build components:
- GitHub repository parser
- LLM evaluation engine
- Scoring system
- UI dashboard

5. Implement Arc-specific checks:
- Arc Testnet RPC validation
- Foundry project detection
- App Kit integration checks
- Smart contract structure analysis

## Deployment
1. Test locally with `npm run dev`
2. Deploy to Vercel or preferred hosting platform
3. Configure environment variables in production
4. Set up monitoring and error tracking

## Arc Integration Points
- Use Arc Testnet RPC endpoints for validation
- Implement App Kit SDK for cross-chain checks
- Follow Arc's reproducibility guidelines
- Align scoring with Arc's "signal vs noise" philosophy