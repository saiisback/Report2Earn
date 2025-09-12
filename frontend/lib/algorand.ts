import algosdk from 'algosdk';
import { getNetworkConfig, getEscrowMnemonic } from '@/config/networks';

// Get current network configuration
const networkConfig = getNetworkConfig();

// Algorand client configuration based on current network
export const algodClient = new algosdk.Algodv2(
  networkConfig.algod.token,
  networkConfig.algod.server,
  networkConfig.algod.port
);

export const indexerClient = new algosdk.Indexer(
  networkConfig.indexer.token,
  networkConfig.indexer.server,
  networkConfig.indexer.port
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

// Network-specific configuration
export const VERIFICATION_ESCROW_ADDRESS = networkConfig.contracts.verificationEscrow;
export const REWARD_CONTRACT_APP_ID = networkConfig.contracts.rewardContractAppId;
export const SMART_CONTRACT_APP_ID = networkConfig.contracts.smartContractAppId;
export const SMART_CONTRACT_ADDRESS = networkConfig.contracts.smartContractAddress;

// Escrow account mnemonic for signing transactions (network-specific)
export const ESCROW_MNEMONIC = getEscrowMnemonic();

// Reward amount (2 ALGO)
export const REWARD_AMOUNT = 2;

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