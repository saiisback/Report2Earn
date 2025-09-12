'use client';

import { useMemo } from 'react';
import { 
  getCurrentNetwork, 
  getNetworkConfig, 
  isMainnet, 
  isTestnet,
  type NetworkType 
} from '@/config/networks';

export interface UseNetworkReturn {
  network: NetworkType;
  config: ReturnType<typeof getNetworkConfig>;
  isMain: boolean;
  isTest: boolean;
  explorerUrl: string;
  chainId: number;
}

/**
 * Hook to get current network information and configuration
 */
export const useNetwork = (): UseNetworkReturn => {
  const network = getCurrentNetwork();
  const config = getNetworkConfig();
  const isMain = isMainnet();
  const isTest = isTestnet();

  const explorerUrl = useMemo(() => {
    return config.explorer.baseUrl;
  }, [config.explorer.baseUrl]);

  return {
    network,
    config,
    isMain,
    isTest,
    explorerUrl,
    chainId: config.chainId,
  };
};

export default useNetwork;
