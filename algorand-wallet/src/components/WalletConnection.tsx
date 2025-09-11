'use client';

import React from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { formatAddress } from '@/lib/algorand';

const WalletConnection: React.FC = () => {
  const { isConnected, address, balance, connect, disconnect, loading } = useWalletContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Wallet Connected</h3>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600">Address</label>
            <p className="text-sm text-gray-800 font-mono">{formatAddress(address)}</p>
            <p className="text-xs text-gray-500 mt-1">Full address: {address}</p>
          </div>
          
          {balance !== null && (
            <div>
              <label className="block text-sm font-medium text-gray-600">Balance</label>
              <p className="text-sm text-gray-800">{balance.toFixed(6)} ALGO</p>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Address exists: {address ? 'Yes' : 'No'}</p>
          </div>
          
          <button
            onClick={disconnect}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto text-center">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Connect Your Wallet</h3>
      <p className="text-sm text-gray-600 mb-6">
        Connect your Pera Wallet to start sending ALGO transactions
      </p>
      <button
        onClick={connect}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition duration-200"
      >
        Connect Pera Wallet
      </button>
    </div>
  );
};

export default WalletConnection;
