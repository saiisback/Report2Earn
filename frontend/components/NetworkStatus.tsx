'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getNetworkConfig, isMainnet, isTestnet } from '@/config/networks';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface NetworkStatusProps {
  className?: string;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({ className = '' }) => {
  const networkConfig = getNetworkConfig();
  const isMain = isMainnet();
  const isTest = isTestnet();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={isMain ? "destructive" : "secondary"}
        className="flex items-center gap-1"
      >
        {isMain ? (
          <>
            <AlertCircle className="h-3 w-3" />
            MAINNET
          </>
        ) : (
          <>
            <CheckCircle className="h-3 w-3" />
            TESTNET
          </>
        )}
      </Badge>
      <span className="text-sm text-muted-foreground">
        {networkConfig.name}
      </span>
    </div>
  );
};

export default NetworkStatus;
