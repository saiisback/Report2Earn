'use client';

import React, { useState, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { algodClient, algosToMicroAlgos, SMART_CONTRACT_APP_ID, SMART_CONTRACT_ADDRESS, ESCROW_MNEMONIC } from '@/lib/algorand';
import algosdk from 'algosdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

// Smart contract details are imported from lib/algorand.ts

type VerificationStatus = 'idle' | 'opting-in' | 'depositing' | 'verifying' | 'claiming' | 'completed' | 'error';

const SmartContractVerificationFlow: React.FC = () => {
  const { isConnected, address, signTransactions, sendTransactions, refreshBalance } = useWalletContext();
  const [link, setLink] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [optInTxId, setOptInTxId] = useState<string | null>(null);
  const [depositTxId, setDepositTxId] = useState<string | null>(null);
  const [claimTxId, setClaimTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOptedIn, setIsOptedIn] = useState(false);


  // Check if user is opted in to the smart contract
  const checkOptInStatus = async () => {
    if (!address) return false;
    
    try {
      const accountInfo = await algodClient.accountInformation(address).do();
      const apps = accountInfo.appsLocalState || [];
      
      const optedIn = apps.some((app: any) => {
        // Convert both to numbers for comparison since app.id might be BigInt
        const appId = Number(app.id);
        const targetAppId = Number(SMART_CONTRACT_APP_ID);
        return appId === targetAppId;
      });
      
      setIsOptedIn(optedIn);
      return optedIn;
    } catch (err) {
      return false;
    }
  };

  // Check opt-in status when component loads or address changes
  useEffect(() => {
    if (address) {
      checkOptInStatus();
    }
  }, [address]);

  const handleOptIn = async () => {
    if (!isConnected || !address || !signTransactions || !sendTransactions) {
      setError('Please connect your wallet first');
      return;
    }

    // Check if already opted in before attempting opt-in
    const alreadyOptedIn = await checkOptInStatus();
    if (alreadyOptedIn) {
      setError('You are already opted in to this smart contract');
      return;
    }

    try {
      setError(null);
      setStatus('opting-in');

      const suggestedParams = await algodClient.getTransactionParams().do();
      
      // Use raw suggested parameters to avoid missing fields
      const cleanSuggestedParams = suggestedParams;

      // Create opt-in transaction
      const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
        sender: address,
        suggestedParams: cleanSuggestedParams,
        appIndex: SMART_CONTRACT_APP_ID,
      });

      const optInTxnBytes = optInTxn.toByte();
      const signedOptInTxn = await signTransactions([optInTxnBytes]);
      const { txId } = await sendTransactions(signedOptInTxn);
      
      setOptInTxId(txId);
      setIsOptedIn(true);
      setStatus('idle');

    } catch (err: any) {
      console.error('Opt-in failed:', err);
      setError(err.message || 'Opt-in failed');
      setStatus('error');
    }
  };

  const handleVerify = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!link.trim()) {
      setError('Please enter a link to verify');
      return;
    }

    if (!signTransactions || !sendTransactions) {
      setError('Wallet functions not available. Please refresh the page.');
      return;
    }

    try {
      setError(null);
      setStatus('depositing');

      // Step 1: User deposits 1 ALGO to smart contract
      const depositAmount = algosToMicroAlgos(1); // 1 ALGO deposit
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Use raw suggested parameters to avoid missing fields
      const cleanSuggestedParams = suggestedParams;

      // Create payment transaction to smart contract
      const depositTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: SMART_CONTRACT_ADDRESS,
        amount: depositAmount,
        suggestedParams: cleanSuggestedParams,
      });

      const depositTxnBytes = depositTxn.toByte();
      const signedTxns = await signTransactions([depositTxnBytes]);
      const { txId: depositTxId } = await sendTransactions(signedTxns);
      
      setDepositTxId(depositTxId);
      setStatus('verifying');

      // Step 2: Call smart contract with NoOp transaction
      const noOpTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: address,
        suggestedParams: cleanSuggestedParams,
        appIndex: SMART_CONTRACT_APP_ID,
      });

      const noOpTxnBytes = noOpTxn.toByte();
      const signedNoOpTxns = await signTransactions([noOpTxnBytes]);
      const { txId: noOpTxId } = await sendTransactions(signedNoOpTxns);

      // Step 3: Simulate AI verification process (3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000));

      setStatus('claiming');

      // Step 4: Send 2 ALGO reward back to user from escrow
      const rewardAmount = algosToMicroAlgos(2); // 2 ALGO reward
      
      // Create escrow account from mnemonic
      const escrowAccount = algosdk.mnemonicToSecretKey(ESCROW_MNEMONIC);
      
      // Create reward transaction from escrow to user
      const rewardTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: escrowAccount.addr,
        receiver: address,
        amount: rewardAmount,
        suggestedParams: cleanSuggestedParams,
      });

      // Sign with escrow account
      const signedRewardTxn = algosdk.signTransaction(rewardTxn, escrowAccount.sk);
      
      // Send transaction
      const response = await algodClient.sendRawTransaction(signedRewardTxn.blob).do();
      const rewardTxId = response.txid;
      
      setClaimTxId(rewardTxId);
      setStatus('completed');

      // Refresh balance
      await refreshBalance();

    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setStatus('error');
    }
  };

  const resetFlow = () => {
    setStatus('idle');
    setDepositTxId(null);
    setClaimTxId(null);
    setError(null);
    setLink('');
  };

  const forceRefreshStatus = async () => {
    await checkOptInStatus();
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'opting-in':
      case 'depositing':
      case 'verifying':
      case 'claiming':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'opting-in':
        return 'Opting in to smart contract...';
      case 'depositing':
        return 'Depositing 1 ALGO to smart contract...';
      case 'verifying':
        return 'AI verifying content...';
      case 'claiming':
        return 'Smart contract sending 2 ALGO reward...';
      case 'completed':
        return 'Verification completed! You received 1 ALGO profit!';
      case 'error':
        return 'Verification failed';
      default:
        return 'Ready to verify';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'opting-in':
      case 'depositing':
      case 'verifying':
      case 'claiming':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  if (!isConnected) {
    return (
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <p className="text-white/80">Please connect your wallet to start verification</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {getStatusIcon()}
          Smart Contract Verification
        </CardTitle>
        <CardDescription className="text-white/80">
          {getStatusText()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {!isOptedIn && (
          <Alert className="border-yellow-500 bg-yellow-500/10">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              <div className="space-y-2">
                <p>You need to opt in to the smart contract first</p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleOptIn}
                    disabled={status !== 'idle'}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Opt In to Smart Contract
                  </Button>
                  <Button
                    onClick={forceRefreshStatus}
                    variant="outline"
                    className="border-yellow-500/50 text-yellow-200 hover:bg-yellow-500/10"
                  >
                    Check Status
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isOptedIn && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-200">
              <div className="space-y-2">
                <p>✅ Successfully opted in to smart contract!</p>
                <Button
                  onClick={forceRefreshStatus}
                  variant="outline"
                  className="border-green-500/50 text-green-200 hover:bg-green-500/10"
                >
                  Refresh Status
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isOptedIn && (
          <>
            <div className="space-y-2">
              <Label htmlFor="link" className="text-white">Content Link</Label>
              <Input
                id="link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com/content-to-verify"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                disabled={status !== 'idle' && status !== 'error'}
              />
            </div>

            {error && (
              <Alert className="border-red-500 bg-red-500/10">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {optInTxId && (
              <Alert className="border-blue-500 bg-blue-500/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-blue-200">
                  <div className="space-y-1">
                    <p>Successfully opted in to smart contract</p>
                    <a
                      href={`https://testnet.algoexplorer.io/tx/${optInTxId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-100"
                    >
                      View on Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {depositTxId && (
              <Alert className="border-green-500 bg-green-500/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-200">
                  <div className="space-y-1">
                    <p>1 ALGO deposited to smart contract</p>
                    <a
                      href={`https://testnet.algoexplorer.io/tx/${depositTxId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-green-300 hover:text-green-100"
                    >
                      View on Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {claimTxId && (
              <Alert className="border-green-500 bg-green-500/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-200">
                  <div className="space-y-1">
                    <p>Smart contract sent 2 ALGO reward!</p>
                    <a
                      href={`https://testnet.algoexplorer.io/tx/${claimTxId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-green-300 hover:text-green-100"
                    >
                      View on Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleVerify}
                disabled={status !== 'idle' || !link.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {status === 'idle' ? 'Start Verification' : getStatusText()}
              </Button>
              
              {(status === 'completed' || status === 'error') && (
                <Button
                  onClick={resetFlow}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Reset
                </Button>
              )}
            </div>
          </>
        )}

        <div className="flex items-center justify-center gap-2 text-sm text-white/60">
          <Badge variant="secondary" className={getStatusColor()}>
            Cost: 1 ALGO deposit + 1 ALGO reward
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartContractVerificationFlow;
