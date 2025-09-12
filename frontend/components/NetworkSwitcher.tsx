'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getCurrentNetwork, isMainnet, isTestnet } from '@/config/networks';

interface NetworkSwitcherProps {
  onNetworkChange?: (network: 'test' | 'main') => void;
  className?: string;
}

export const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ 
  onNetworkChange,
  className = '' 
}) => {
  const [isChanging, setIsChanging] = useState(false);
  const currentNetwork = getCurrentNetwork();
  const isMain = isMainnet();
  const isTest = isTestnet();

  const handleNetworkChange = async (newNetwork: 'test' | 'main') => {
    if (newNetwork === currentNetwork) return;
    
    setIsChanging(true);
    
    try {
      // Show warning for mainnet
      if (newNetwork === 'main') {
        const confirmed = window.confirm(
          '⚠️ WARNING: You are about to switch to MAINNET!\n\n' +
          'This will use real ALGO and real smart contracts.\n' +
          'Make sure you have the correct configuration and contracts deployed.\n\n' +
          'Are you sure you want to continue?'
        );
        
        if (!confirmed) {
          setIsChanging(false);
          return;
        }
      }
      
      // In a real application, you would need to restart the app or reload
      // to pick up the new environment variables
      alert(
        `To switch to ${newNetwork === 'main' ? 'MAINNET' : 'TESTNET'}, please:\n\n` +
        '1. Update NEXT_PUBLIC_NETWORK_SETUP in your .env file\n' +
        '2. Restart the development server\n' +
        '3. Refresh the page'
      );
      
      onNetworkChange?.(newNetwork);
    } catch (error) {
      console.error('Failed to change network:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isChanging ? 'animate-spin' : ''}`} />
          Network Configuration
        </CardTitle>
        <CardDescription>
          Switch between Algorand testnet and mainnet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Testnet</span>
              <Badge variant="secondary">Safe</Badge>
            </div>
            <Button
              variant={isTest ? "default" : "outline"}
              size="sm"
              onClick={() => handleNetworkChange('test')}
              disabled={isChanging || isTest}
            >
              {isTest ? 'Active' : 'Switch'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="font-medium">Mainnet</span>
              <Badge variant="destructive">Live</Badge>
            </div>
            <Button
              variant={isMain ? "default" : "outline"}
              size="sm"
              onClick={() => handleNetworkChange('main')}
              disabled={isChanging || isMain}
            >
              {isMain ? 'Active' : 'Switch'}
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>Current: <strong>{currentNetwork === 'main' ? 'MAINNET' : 'TESTNET'}</strong></p>
          <p className="mt-1">
            {isMain 
              ? '⚠️ Using real ALGO and live smart contracts'
              : '✅ Using test ALGO and test smart contracts'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkSwitcher;
