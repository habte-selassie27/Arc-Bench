export const ARC_RPC_URL = process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network';
export const ARC_CHAIN_ID = parseInt(process.env.ARC_CHAIN_ID || '5042002', 10);
export const ARC_CHAIN_ID_HEX = '0x' + ARC_CHAIN_ID.toString(16);

export const ARCSCAN_API_URL = process.env.ARCSCAN_API_URL || 'https://testnet.arcscan.app/api';
export const ARCSCAN_BASE_URL = process.env.ARCSCAN_BASE_URL || 'https://testnet.arcscan.app';

export const APP_BASE_URL = process.env.APP_BASE_URL || 'https://arc-task-verifier.vercel.app';
export const APP_DEPLOY_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : APP_BASE_URL;
