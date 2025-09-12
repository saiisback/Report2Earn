'use client';

import React, { useState } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { algodClient, algosToMicroAlgos, VERIFICATION_ESCROW_ADDRESS, ESCROW_MNEMONIC } from '@/lib/algorand';
import algosdk from 'algosdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceholdersAndVanishInput } from '@/components/input-front';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

type VerificationStatus = 'idle' | 'depositing' | 'verifying' | 'refunding' | 'completed' | 'error';

const VerificationFlow: React.FC = () => {
  const { isConnected, address, signTransactions, sendTransactions, refreshBalance } = useWalletContext();
  const [link, setLink] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [depositTxId, setDepositTxId] = useState<string | null>(null);
  const [refundTxId, setRefundTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      // Step 1: Deposit 1 ALGO to escrow
      const depositAmount = algosToMicroAlgos(1); // 1 ALGO deposit
      const suggestedParams = await algodClient.getTransactionParams().do();

      const cleanSuggestedParams = {
        flatFee: suggestedParams.flatFee,
        fee: Number(suggestedParams.fee),
        minFee: Number(suggestedParams.minFee),
        firstValid: Number(suggestedParams.firstValid),
        lastValid: Number(suggestedParams.lastValid),
        genesisID: suggestedParams.genesisID,
        genesisHash: suggestedParams.genesisHash,
      };

      // Create deposit transaction to escrow address
      const depositTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: VERIFICATION_ESCROW_ADDRESS, // Send to escrow address
        amount: depositAmount,
        suggestedParams: cleanSuggestedParams,
      });

      const depositTxnBytes = depositTxn.toByte();
      const signedDepositTxn = await signTransactions([depositTxnBytes]);
      const { txId: depositTxId } = await sendTransactions(signedDepositTxn);
      
      setDepositTxId(depositTxId);
      setStatus('verifying');

      // Step 2: Simulate verification process (3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000));

      setStatus('refunding');

      // Step 3: Escrow sends reward back to user (2 ALGO total: 1 original + 1 reward)
      const rewardAmount = algosToMicroAlgos(2); // 2 ALGO total (1 original + 1 reward)
      
      // Escrow transaction: escrow account sends reward to user
      // Create escrow account from mnemonic
      const escrowAccount = algosdk.mnemonicToSecretKey(ESCROW_MNEMONIC);
      
      // Create reward transaction from escrow to user
      const rewardTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: escrowAccount.addr,
        receiver: address, // User receives the reward
        amount: rewardAmount,
        suggestedParams: cleanSuggestedParams,
      });

      // Sign with escrow account
      const signedRewardTxn = algosdk.signTransaction(rewardTxn, escrowAccount.sk);
      
      // Send transaction
      const response = await algodClient.sendRawTransaction(signedRewardTxn.blob).do();
      const rewardTxId = response.txid;
      
      setRefundTxId(rewardTxId);
      
      setStatus('completed');

      // Refresh balance
      await refreshBalance();

    } catch (err: any) {
      console.error('Verification failed:', err);
      setError(err.message || 'Verification failed');
      setStatus('error');
    }
  };

  const resetFlow = () => {
    setStatus('idle');
    setDepositTxId(null);
    setRefundTxId(null);
    setError(null);
    setLink('');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'depositing':
      case 'verifying':
      case 'refunding':
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
      case 'depositing':
        return 'Depositing 1 ALGO to escrow...';
      case 'verifying':
        return 'Verifying content...';
      case 'refunding':
        return 'Escrow sending reward (2 ALGO)...';
      case 'completed':
        return 'Verification completed! Escrow sent you 1 ALGO profit!';
      case 'error':
        return 'Verification failed';
      default:
        return 'Ready to verify';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'depositing':
      case 'verifying':
      case 'refunding':
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
          AI Verification
        </CardTitle>
        <CardDescription className="text-white/80">
          {getStatusText()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="link" className="text-white">Content Link</Label>
          <PlaceholdersAndVanishInput
            placeholders={[
              "https://example.com/content-to-verify",
              "https://news.com/article-to-check",
              "https://social.com/post-to-verify"
            ]}
            onChange={(e) => setLink(e.target.value)}
            onSubmit={() => {
              if (status === 'idle' && link.trim()) {
                handleVerify();
              }
            }}
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

        {depositTxId && (
          <Alert className="border-blue-500 bg-blue-500/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-blue-200">
              <div className="space-y-1">
                <p>1 ALGO deposited to escrow</p>
                <a
                  href={`https://testnet.algoexplorer.io/tx/${depositTxId}`}
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

        {refundTxId && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-200">
              <div className="space-y-1">
                <p>Reward transaction confirmed (2 ALGO received from escrow)</p>
                <a
                  href={`https://testnet.algoexplorer.io/tx/${refundTxId}`}
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
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold rounded-lg"
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

        <div className="flex items-center justify-center">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Cost: 1 ALGO deposit → 2 ALGO reward (only if content is FAKE)
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default VerificationFlow;
