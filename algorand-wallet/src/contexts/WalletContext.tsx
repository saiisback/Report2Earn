'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UseWalletProvider, useWallet } from '@txnlab/use-wallet-react';
import { algodClient, formatAddress, microAlgosToAlgos } from '@/lib/algorand';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  balance: number | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
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

const WalletProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connect: connectWallet, disconnect: disconnectWallet, activeAccount, signTransactions, sendTransactions } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const isConnected = !!activeAccount;
  const address = activeAccount?.address || null;

  const connect = async () => {
    try {
      setLoading(true);
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setLoading(true);
      await disconnectWallet();
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
      const balanceInAlgos = microAlgosToAlgos(accountInfo.amount);
      setBalance(balanceInAlgos);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
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
    loading,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <UseWalletProvider>
      <WalletProviderInner>{children}</WalletProviderInner>
    </UseWalletProvider>
  );
};
