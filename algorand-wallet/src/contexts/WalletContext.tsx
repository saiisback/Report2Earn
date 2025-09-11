'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import { algodClient, formatAddress, microAlgosToAlgos } from '@/lib/algorand';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  balance: number | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>;
  sendTransactions: (signedTxns: Uint8Array[]) => Promise<{ txId: string }>;
  loading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [peraWallet, setPeraWallet] = useState<PeraWalletConnect | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('Initializing Pera Wallet...');
    const peraWalletConnect = new PeraWalletConnect({
      chainId: 416002, // Testnet
    });

    console.log('PeraWallet object:', peraWalletConnect);
    console.log('PeraWallet methods:', Object.getOwnPropertyNames(peraWalletConnect));
    console.log('signTransaction method:', typeof peraWalletConnect.signTransaction);

    setPeraWallet(peraWalletConnect);
    console.log('Pera Wallet initialized');

    // Check if already connected
    peraWalletConnect.reconnectSession().then((accounts) => {
      console.log('Reconnect session accounts:', accounts);
      if (accounts.length) {
        setAddress(accounts[0]);
        setIsConnected(true);
        console.log('Reconnected to wallet:', accounts[0]);
      }
    }).catch((error) => {
      console.log('No existing session:', error);
    });

    // Note: PeraWallet doesn't have onDisconnect event listener
    // We'll handle disconnection through the disconnect method

    return () => {
      peraWalletConnect.disconnect();
    };
  }, []);

  const connect = async () => {
    if (!peraWallet) {
      console.error('PeraWallet not initialized');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Attempting to connect to Pera Wallet...');
      const accounts = await peraWallet.connect();
      console.log('Connected accounts:', accounts);
      if (accounts.length) {
        const connectedAddress = accounts[0];
        console.log('Setting address:', connectedAddress, 'Type:', typeof connectedAddress);
        setAddress(connectedAddress);
        setIsConnected(true);
        console.log('Wallet connected successfully:', connectedAddress);
      } else {
        console.log('No accounts returned from Pera Wallet');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!peraWallet) return;
    
    try {
      setLoading(true);
      await peraWallet.disconnect();
      setAddress(null);
      setIsConnected(false);
      setBalance(null);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      const accountInfo = await algodClient.accountInformation(address).do();
      const balanceInAlgos = microAlgosToAlgos(Number(accountInfo.amount));
      setBalance(balanceInAlgos);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const signTransactions = async (txns: Uint8Array[]): Promise<Uint8Array[]> => {
    if (!peraWallet || !address) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log('Signing transaction with Pera Wallet...');
      console.log('Transaction bytes length:', txns[0]?.length);
      
      // Check if signTransaction method exists
      if (typeof peraWallet.signTransaction !== 'function') {
        throw new Error('signTransaction method not available on PeraWallet');
      }
      
      // Convert Uint8Array back to Transaction object for Pera Wallet
      // We need to decode the transaction bytes back to a Transaction object
      const algosdk = await import('algosdk');
      const txn = algosdk.decodeUnsignedTransaction(txns[0]);
      
      console.log('Decoded transaction:', txn);
      
      // Pera Wallet Connect expects SignerTransaction[][] format
      // Each group is an array of SignerTransaction objects
      const transactionToSign = [[{
        txn: txn,
        message: 'Please sign this transaction'
      }]];
      
      console.log('Sending transaction to Pera Wallet:', transactionToSign);
      
      const signedTxns = await peraWallet.signTransaction(transactionToSign);
      
      console.log('Transaction signed successfully');
      console.log('Signed transaction type:', typeof signedTxns);
      console.log('Signed transaction length:', signedTxns?.length);
      
      // The signed transactions are already Uint8Array[]
      return signedTxns;
    } catch (error) {
      console.error('Failed to sign transactions:', error);
      throw error;
    }
  };

  const sendTransactions = async (signedTxns: Uint8Array[]): Promise<{ txId: string }> => {
    try {
      console.log('Sending signed transaction to Algorand network...');
      const result = await algodClient.sendRawTransaction(signedTxns[0]).do();
      console.log('Transaction submitted successfully:', result.txid);
      return { txId: result.txid };
    } catch (error) {
      console.error('Failed to send transactions:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (address) {
      refreshBalance();
    }
  }, [address]);

  const value: WalletContextType = {
    isConnected,
    address,
    balance,
    connect,
    disconnect,
    refreshBalance,
    signTransactions,
    sendTransactions,
    loading,
  };

  console.log('WalletContext value:', { 
    isConnected, 
    address, 
    addressType: typeof address,
    addressLength: address?.length,
    loading 
  });

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export { WalletProvider };
