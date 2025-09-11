import algosdk from 'algosdk';

// Algorand client configuration
export const algodClient = new algosdk.Algodv2(
  process.env.NEXT_PUBLIC_ALGOD_TOKEN || '',
  process.env.NEXT_PUBLIC_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
  process.env.NEXT_PUBLIC_ALGOD_PORT || 443
);

export const indexerClient = new algosdk.Indexer(
  process.env.NEXT_PUBLIC_INDEXER_TOKEN || '',
  process.env.NEXT_PUBLIC_INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
  process.env.NEXT_PUBLIC_INDEXER_PORT || 443
);

// Utility functions
export const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

export const microAlgosToAlgos = (microAlgos: number) => {
  return microAlgos / 1000000;
};

export const algosToMicroAlgos = (algos: number) => {
  return Math.round(algos * 1000000);
};
