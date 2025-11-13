/**
 * Network Configuration for Algorand Mainnet and Testnet
 * This file contains all network-specific configurations
 */

export type NetworkType = 'test' | 'main';

export interface NetworkConfig {
  name: string;
  chainId: number;
  algod: {
    token: string;
    server: string;
    port: number;
  };
  indexer: {
    token: string;
    server: string;
    port: number;
  };
  contracts: {
    verificationEscrow: string;
    rewardContractAppId: number;
    smartContractAppId: number;
    smartContractAddress: string;
  };
  explorer: {
    baseUrl: string;
  };
}

export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  test: {
    name: 'Algorand Testnet',
    chainId: 416002,
    algod: {
      token: process.env.NEXT_PUBLIC_TESTNET_ALGOD_TOKEN || '',
      server: process.env.NEXT_PUBLIC_TESTNET_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
      port: parseInt(process.env.NEXT_PUBLIC_TESTNET_ALGOD_PORT || '443'),
    },
    indexer: {
      token: process.env.NEXT_PUBLIC_TESTNET_INDEXER_TOKEN || '',
      server: process.env.NEXT_PUBLIC_TESTNET_INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
      port: parseInt(process.env.NEXT_PUBLIC_TESTNET_INDEXER_PORT || '443'),
    },
    contracts: {
      verificationEscrow: process.env.NEXT_PUBLIC_TESTNET_VERIFICATION_ESCROW || 'Q3Z2HNPQXU4WZYW3XXOEOSRBWUCURKBZTGYOEFVREWOX52QIHE7WELNECQ',
      rewardContractAppId: parseInt(process.env.NEXT_PUBLIC_TESTNET_REWARD_CONTRACT_APP_ID || '0'),
      smartContractAppId: parseInt(process.env.NEXT_PUBLIC_TESTNET_SMART_CONTRACT_APP_ID || '745687090'),
      smartContractAddress: process.env.NEXT_PUBLIC_TESTNET_SMART_CONTRACT_ADDRESS || 'Q3Z2HNPQXU4WZYW3XXOEOSRBWUCURKBZTGYOEFVREWOX52QIHE7WELNECQ',
    },
    explorer: {
      baseUrl: 'https://testnet.algoexplorer.io',
    },
  },
  main: {
    name: 'Algorand Mainnet',
    chainId: 416001,
    algod: {
      token: process.env.NEXT_PUBLIC_MAINNET_ALGOD_TOKEN || '',
      server: process.env.NEXT_PUBLIC_MAINNET_ALGOD_SERVER || 'https://mainnet-api.algonode.cloud',
      port: parseInt(process.env.NEXT_PUBLIC_MAINNET_ALGOD_PORT || '443'),
    },
    indexer: {
      token: process.env.NEXT_PUBLIC_MAINNET_INDEXER_TOKEN || '',
      server: process.env.NEXT_PUBLIC_MAINNET_INDEXER_SERVER || 'https://mainnet-idx.algonode.cloud',
      port: parseInt(process.env.NEXT_PUBLIC_MAINNET_INDEXER_PORT || '443'),
    },
    contracts: {
      verificationEscrow: process.env.NEXT_PUBLIC_MAINNET_VERIFICATION_ESCROW || '',
      rewardContractAppId: parseInt(process.env.NEXT_PUBLIC_MAINNET_REWARD_CONTRACT_APP_ID || '0'),
      smartContractAppId: parseInt(process.env.NEXT_PUBLIC_MAINNET_SMART_CONTRACT_APP_ID || '0'),
      smartContractAddress: process.env.NEXT_PUBLIC_MAINNET_SMART_CONTRACT_ADDRESS || '',
    },
    explorer: {
      baseUrl: 'https://algoexplorer.io',
    },
  },
};

/**
 * Get the current network configuration based on environment variable
 */
export const getCurrentNetwork = (): NetworkType => {
  const networkSetup = process.env.NEXT_PUBLIC_NETWORK_SETUP as NetworkType;
  return networkSetup === 'main' ? 'main' : 'test';
};

/**
 * Get the current network configuration
 */
export const getNetworkConfig = (): NetworkConfig => {
  const currentNetwork = getCurrentNetwork();
  return NETWORK_CONFIGS[currentNetwork];
};

/**
 * Get escrow mnemonic for the current network
 */
export const getEscrowMnemonic = (): string => {
  const currentNetwork = getCurrentNetwork();
  return currentNetwork === 'main' 
    ? (process.env.MAINNET_ESCROW_MNEMONIC || '')
    : (process.env.TESTNET_ESCROW_MNEMONIC || 'guide once swamp raw view hospital unhappy timber trend people useful sausage venue harsh embody sponsor oyster come museum notice interest tribe beach abandon luggage');
};

/**
 * Check if we're on mainnet
 */
export const isMainnet = (): boolean => {
  return getCurrentNetwork() === 'main';
};

/**
 * Check if we're on testnet
 */
export const isTestnet = (): boolean => {
  return getCurrentNetwork() === 'test';
};
