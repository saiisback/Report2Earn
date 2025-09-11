'use client';

import React from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { formatAddress } from '@/lib/algorand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Wallet Connected</CardTitle>
            <Badge variant="secondary" className="bg-green-500 text-white">
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <CardDescription className="text-white/80 mb-1">Address</CardDescription>
            <p className="text-sm text-white font-mono">{formatAddress(address)}</p>
            <p className="text-xs text-white/60 mt-1">Full: {address}</p>
          </div>
          
          {balance !== null && (
            <div>
              <CardDescription className="text-white/80 mb-1">Balance</CardDescription>
              <p className="text-sm text-white font-semibold">{balance.toFixed(6)} ALGO</p>
            </div>
          )}
          
          <Button
            onClick={disconnect}
            variant="destructive"
            className="w-full"
          >
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Connect Your Wallet</CardTitle>
        <CardDescription className="text-white/80">
          Connect your Pera Wallet to start verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={connect}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Connect Pera Wallet
        </Button>
      </CardContent>
    </Card>
  );
};

export default WalletConnection;
