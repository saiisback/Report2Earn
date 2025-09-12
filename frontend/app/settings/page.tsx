'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NetworkStatus } from '@/components/NetworkStatus';
import { NetworkSwitcher } from '@/components/NetworkSwitcher';
import { useNetwork } from '@/hooks/useNetwork';
import { AlertCircle, CheckCircle, ExternalLink, Settings } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { network, config, isMain, isTest, explorerUrl } = useNetwork();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-8 w-8" />
            <h1 className="text-4xl font-bold">Settings</h1>
          </div>
          <p className="text-white/70 text-lg">
            Configure your network settings and view current configuration
          </p>
        </div>

        {/* Current Network Status */}
        <Card className="mb-8 bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isMain ? <AlertCircle className="h-5 w-5 text-red-500" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
              Current Network
            </CardTitle>
            <CardDescription>
              Your current Algorand network configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <NetworkStatus />
                <p className="text-sm text-gray-400 mt-2">
                  Chain ID: {config.chainId}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a 
                  href={`${explorerUrl}/address/${config.contracts.verificationEscrow}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Explorer
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Network Switcher */}
        <Card className="mb-8 bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle>Switch Network</CardTitle>
            <CardDescription>
              Change between Algorand testnet and mainnet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NetworkSwitcher />
          </CardContent>
        </Card>

        {/* Network Configuration Details */}
        <Card className="mb-8 bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle>Network Configuration</CardTitle>
            <CardDescription>
              Current network settings and contract addresses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Algorand Node</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-400">Server:</span> {config.algod.server}</p>
                  <p><span className="text-gray-400">Port:</span> {config.algod.port}</p>
                  <p><span className="text-gray-400">Token:</span> {config.algod.token ? '***' : 'Not set'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Indexer</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-400">Server:</span> {config.indexer.server}</p>
                  <p><span className="text-gray-400">Port:</span> {config.indexer.port}</p>
                  <p><span className="text-gray-400">Token:</span> {config.indexer.token ? '***' : 'Not set'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h4 className="font-semibold mb-2">Smart Contracts</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-400">Verification Escrow:</span> {config.contracts.verificationEscrow}</p>
                <p><span className="text-gray-400">Smart Contract App ID:</span> {config.contracts.smartContractAppId}</p>
                <p><span className="text-gray-400">Smart Contract Address:</span> {config.contracts.smartContractAddress}</p>
                <p><span className="text-gray-400">Reward Contract App ID:</span> {config.contracts.rewardContractAppId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Variables Help */}
        <Card className="mb-8 bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle>Environment Configuration</CardTitle>
            <CardDescription>
              How to configure your environment variables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-800 rounded-lg">
                <h4 className="font-semibold mb-2">Current Environment Variable:</h4>
                <code className="text-green-400">
                  NEXT_PUBLIC_NETWORK_SETUP={network}
                </code>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm">
                  To switch networks, update your <code className="bg-gray-800 px-2 py-1 rounded">.env.local</code> file:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-800 rounded">
                    <p className="text-sm font-mono text-green-400"># For testnet</p>
                    <p className="text-sm font-mono">NEXT_PUBLIC_NETWORK_SETUP=test</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded">
                    <p className="text-sm font-mono text-red-400"># For mainnet</p>
                    <p className="text-sm font-mono">NEXT_PUBLIC_NETWORK_SETUP=main</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning for Mainnet */}
        {isMain && (
          <Card className="mb-8 bg-red-900/20 border-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                Mainnet Warning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-200">
                You are currently connected to Algorand Mainnet. This means you are using real ALGO 
                and interacting with live smart contracts. Make sure you have the correct configuration 
                and contracts deployed before proceeding.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Back to Home */}
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
