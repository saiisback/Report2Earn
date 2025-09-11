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

// Verification escrow address (using the smart contract creator's address)
// In production, this should be a smart contract address
export const VERIFICATION_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_VERIFICATION_ESCROW || 'Q3Z2HNPQXU4WZYW3XXOEOSRBWUCURKBZTGYOEFVREWOX52QIHE7WELNECQ';

// Escrow account mnemonic for signing transactions (for testing only)
// Using the smart contract creator's mnemonic since it has ALGO
export const ESCROW_MNEMONIC = process.env.ESCROW_MNEMONIC || 'guide once swamp raw view hospital unhappy timber trend people useful sausage venue harsh embody sponsor oyster come museum notice interest tribe beach abandon luggage';

// Smart contract configuration
export const REWARD_CONTRACT_APP_ID = process.env.NEXT_PUBLIC_REWARD_CONTRACT_APP_ID || 0;
export const REWARD_AMOUNT = 2; // 2 ALGO

// New smart contract for verification rewards
export const SMART_CONTRACT_APP_ID = 745687090;
export const SMART_CONTRACT_ADDRESS = 'Q3Z2HNPQXU4WZYW3XXOEOSRBWUCURKBZTGYOEFVREWOX52QIHE7WELNECQ';

// Smart contract interaction functions
export const optInToRewardContract = async (userAddress: string) => {
  const suggestedParams = await algodClient.getTransactionParams().do();
  
  const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
    sender: userAddress,
    suggestedParams: {
      ...suggestedParams,
      fee: 1000, // Minimum transaction fee
      flatFee: true,
    },
    appIndex: Number(REWARD_CONTRACT_APP_ID),
  });
  
  return optInTxn;
};

export const claimReward = async (userAddress: string) => {
  const suggestedParams = await algodClient.getTransactionParams().do();
  
  // For this simplified version, we'll just call the smart contract
  // The actual ALGO transfer will be handled by a separate payment from the escrow account
  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: userAddress,
    suggestedParams: {
      ...suggestedParams,
      fee: 1000, // Minimum transaction fee
      flatFee: true,
    },
    appIndex: Number(REWARD_CONTRACT_APP_ID),
  });
  
  return appCallTxn;
};

export const checkUserOptedIn = async (userAddress: string): Promise<boolean> => {
  try {
    const accountInfo = await algodClient.accountInformation(userAddress).do();
    const apps = accountInfo.appsLocalState || [];
    
    return apps.some((app: any) => app.id === Number(REWARD_CONTRACT_APP_ID));
  } catch (error) {
    console.error('Error checking opt-in status:', error);
    return false;
  }
};

export const checkUserClaimed = async (userAddress: string): Promise<boolean> => {
  try {
    const accountInfo = await algodClient.accountInformation(userAddress).do();
    const apps = accountInfo.appsLocalState || [];
    
    const userApp = apps.find((app: any) => app.id === Number(REWARD_CONTRACT_APP_ID));
    if (!userApp) return false;
    
    const keyValue = userApp.keyValue || [];
    const claimedKey = algosdk.encodeUint64(0); // Simple key for 'claimed' flag
    
    const claimedEntry = keyValue.find((kv: any) => 
      Buffer.from(kv.key, 'base64').equals(claimedKey)
    );
    
    return !!(claimedEntry && Number(claimedEntry.value.uint) === 1);
  } catch (error) {
    console.error('Error checking claim status:', error);
    return false;
  }
};