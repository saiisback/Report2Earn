'use client';

import React from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { formatAddress } from '@/lib/algorand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

const WalletConnection: React.FC = () => {
  const { isConnected, address, balance, connect, disconnect, loading } = useWalletContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-white">Loading...</span>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-white text-sm font-medium">{formatAddress(address)}</div>
          {balance !== null && (
            <div className="text-white/70 text-xs">{balance.toFixed(4)} ALGO</div>
          )}
        </div>
        <button
          onClick={disconnect}
          className="border border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent px-3 py-1 rounded text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20"
          style={{ color: 'white', backgroundColor: 'transparent' }}
        >
          <span style={{ color: 'white' }}>Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={connect}
        className="bg-white text-black px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl border-0 focus:outline-none focus:ring-2 focus:ring-gray-300"
        style={{ 
          background: 'white',
          color: 'black',
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--font-instrument-serif)'
        }}
      >
        Connect Pera Wallet
      </button>
    </div>
  );
};

export default WalletConnection;
