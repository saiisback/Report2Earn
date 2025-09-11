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

// Generate a test escrow account for development
const generateTestEscrowAccount = () => {
  try {
    const account = algosdk.generateAccount();
    return {
      address: account.addr,
      mnemonic: algosdk.secretKeyToMnemonic(account.sk)
    };
  } catch (error) {
    console.error('Failed to generate test account:', error);
    // Fallback to a known test account
    return {
      address: 'YOUR_VALID_ESCROW_ADDRESS_HERE',
      mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
    };
  }
};

const testEscrowAccount = generateTestEscrowAccount();

// Verification escrow address (using a valid test address for now)
// In production, this should be a smart contract address
export const VERIFICATION_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_VERIFICATION_ESCROW || testEscrowAccount.address;

// Escrow account mnemonic for signing transactions (for testing only)
// In production, this would be handled by a smart contract
export const ESCROW_MNEMONIC = process.env.ESCROW_MNEMONIC || testEscrowAccount.mnemonic;