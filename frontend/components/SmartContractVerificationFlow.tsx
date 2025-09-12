'use client';

import React, { useState, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { algodClient, algosToMicroAlgos, SMART_CONTRACT_APP_ID, SMART_CONTRACT_ADDRESS, ESCROW_MNEMONIC } from '@/lib/algorand';
import algosdk from 'algosdk';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/special-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceholdersAndVanishInput } from '@/components/input-front';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Smart contract details are imported from lib/algorand.ts

type VerificationStatus = 'idle' | 'opting-in' | 'depositing' | 'verifying' | 'claiming' | 'completed' | 'error';

// Type definitions for verification results
interface VerificationResult {
  final_decision: string | {
    value: 'authentic' | 'fake' | 'uncertain';
  };
  confidence: number;
  consensus_score: number;
  group_reasoning: string;
  individual_decisions?: Array<{
    agent_name: string;
    decision: 'authentic' | 'fake' | 'uncertain';
    confidence: number;
    reasoning: string;
    evidence: string[];
  }>;
}

const SmartContractVerificationFlow: React.FC = () => {
  const { isConnected, address, signTransactions, sendTransactions, refreshBalance } = useWalletContext();
  const { toast } = useToast();
  const [link, setLink] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [optInTxId, setOptInTxId] = useState<string | null>(null);
  const [depositTxId, setDepositTxId] = useState<string | null>(null);
  const [claimTxId, setClaimTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [triggerVanish, setTriggerVanish] = useState<(() => void) | null>(null);


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
      
      toast({
        title: "Successfully opted in!",
        description: "You can now start verifying content.",
        duration: 3000,
      });

    } catch (err: any) {
      console.error('Opt-in failed:', err);
      setError(err.message || 'Opt-in failed');
      setStatus('error');
      
      toast({
        title: "Opt-in failed",
        description: err.message || 'Failed to opt in to smart contract',
        variant: "destructive",
        duration: 5000,
      });
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

    // Trigger vanish effect
    if (triggerVanish) {
      triggerVanish();
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
      
      toast({
        title: "Deposit successful!",
        description: "1 ALGO deposited. Starting AI verification...",
        duration: 3000,
      });

      // Step 2: Call smart contract with NoOp transaction
      const noOpTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: address,
        suggestedParams: cleanSuggestedParams,
        appIndex: SMART_CONTRACT_APP_ID,
      });

      const noOpTxnBytes = noOpTxn.toByte();
      const signedNoOpTxns = await signTransactions([noOpTxnBytes]);
      const { txId: noOpTxId } = await sendTransactions(signedNoOpTxns);

      // Step 3: AI Verification
      console.log('🤖 Starting AI verification for URL:', link);
      
      toast({
        title: "AI verification started",
        description: "Multiple AI agents are analyzing the content...",
        duration: 3000,
      });
      
      let verificationData;
      
      try {
        // Add timeout to prevent infinite loading
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for AI processing
        
        const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/scrape-and-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: link }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('📡 API Response received:', apiResponse.status);
        
        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error('❌ API Error:', apiResponse.status, errorText);
          throw new Error(`AI verification API error (${apiResponse.status}): ${errorText}`);
        }
        
        verificationData = await apiResponse.json();
        console.log('📊 Verification data received:', verificationData);
        
        if (!verificationData.success) {
          console.error('❌ Verification failed:', verificationData.error);
          throw new Error(verificationData.error || 'AI verification failed');
        }
      } catch (apiError: any) {
        console.error('AI Verification API Error:', apiError);
        if (apiError.name === 'AbortError') {
          throw new Error('AI verification timed out after 2 minutes');
        }
        throw new Error(`AI verification failed: ${apiError.message}`);
      }

      // Get the verification result
      const verificationResult = verificationData.result;
      
      // Extract final decision with better error handling
      let finalDecision = 'uncertain';
      if (verificationResult?.final_decision) {
        if (typeof verificationResult.final_decision === 'string') {
          finalDecision = verificationResult.final_decision.toLowerCase();
        } else if (verificationResult.final_decision.value) {
          finalDecision = verificationResult.final_decision.value.toLowerCase();
        }
      }
      
      console.log('🔍 Debug - verificationResult:', verificationResult);
      console.log('🔍 Debug - final_decision:', verificationResult?.final_decision);
      console.log('🔍 Debug - extracted finalDecision:', finalDecision);
      
      // Store verification result for UI display
      setVerificationResult(verificationResult);
      
      console.log('AI Verification Result:', {
        decision: finalDecision,
        confidence: verificationResult?.confidence,
        reasoning: verificationResult?.group_reasoning
      });

      // Step 4: Send reward based on verification result
      // Only send 2 ALGO if content is verified as FAKE
      // No reward for authentic or uncertain results
      if (finalDecision === 'fake') {
        setStatus('claiming');
        
        toast({
          title: "Content verified as FAKE!",
          description: "Sending 2 ALGO reward (1 original + 1 profit)...",
          duration: 3000,
        });
        
        try {
          const rewardAmount = algosToMicroAlgos(2); // 2 ALGO reward (1 original + 1 profit)
          
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
          
          toast({
            title: "Reward sent!",
            description: "You received 2 ALGO (1 original + 1 profit) for detecting fake content!",
            duration: 5000,
          });
        } catch (rewardError: any) {
          console.error('Reward transaction failed:', rewardError);
          throw new Error(`Failed to send reward: ${rewardError.message}`);
        }
      } else {
        // No reward for uncertain results
        setStatus('completed');
        
        const decisionText = finalDecision === 'authentic' ? 'AUTHENTIC' : 'UNCERTAIN';
        toast({
          title: `Content verified as ${decisionText}`,
          description: "No reward given for authentic or uncertain content.",
          duration: 3000,
        });
      }

      // Refresh balance
      await refreshBalance();

    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setStatus('error');
      
      toast({
        title: "Verification failed",
        description: err.message || 'Something went wrong during verification',
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const resetFlow = () => {
    setStatus('idle');
    setDepositTxId(null);
    setClaimTxId(null);
    setError(null);
    setLink('');
    setVerificationResult(null);
  };

  const forceRefreshStatus = async () => {
    await checkOptInStatus();
  };

  // Helper function to get the decision value from verification result
  const getDecisionValue = (verificationResult: VerificationResult | null): string => {
    if (!verificationResult) return 'uncertain';
    
    if (typeof verificationResult.final_decision === 'string') {
      return verificationResult.final_decision.toLowerCase();
    }
    if (verificationResult.final_decision?.value) {
      return verificationResult.final_decision.value.toLowerCase();
    }
    
    return 'uncertain';
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
        return 'AI agents analyzing content...';
      case 'claiming':
        return 'Smart contract sending 2 ALGO reward...';
      case 'completed':
        if (verificationResult) {
          const decision = getDecisionValue(verificationResult);
          if (decision === 'fake') {
            return 'Verification completed! Content is FAKE - You received 2 ALGO (1 original + 1 profit)!';
          } else if (decision === 'authentic') {
            return 'Verification completed! Content is AUTHENTIC - No reward given.';
          } else {
            return 'Verification completed! Content was uncertain - no reward given.';
          }
        }
        return 'Verification completed!';
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
    <Card className="bg-white/10 border-white/20 backdrop-blur-sm max-w-md mx-auto">
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
          <>
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
                  // Don't auto-submit on enter, let button handle it
                }}
                showArrow={false}
                onVanishTrigger={(vanishFn: () => void) => setTriggerVanish(() => vanishFn)}
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

            {verificationResult && (
              <Alert className={`${
                getDecisionValue(verificationResult) === 'authentic' 
                  ? 'border-green-500 bg-green-500/10' 
                  : getDecisionValue(verificationResult) === 'fake'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-yellow-500 bg-yellow-500/10'
              }`}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className={`${
                  getDecisionValue(verificationResult) === 'authentic' 
                    ? 'text-green-200' 
                    : getDecisionValue(verificationResult) === 'fake'
                    ? 'text-red-200'
                    : 'text-yellow-200'
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">AI Verification Result:</span>
                      <Badge variant="secondary" className={
                        getDecisionValue(verificationResult) === 'authentic' 
                          ? 'bg-green-600 text-white' 
                          : getDecisionValue(verificationResult) === 'fake'
                          ? 'bg-red-600 text-white'
                          : 'bg-yellow-600 text-white'
                      }>
                        {getDecisionValue(verificationResult).toUpperCase()}
                      </Badge>
                      <span className="text-sm">
                        (Confidence: {Math.round(verificationResult.confidence * 100)}%)
                      </span>
                    </div>
                    <p className="text-sm">{verificationResult.group_reasoning}</p>
                    {getDecisionValue(verificationResult) === 'fake' && (
                      <p className="text-sm font-medium text-green-200">✅ Reward: 2 ALGO (1 original + 1 profit) - Content is FAKE!</p>
                    )}
                    {(getDecisionValue(verificationResult) === 'authentic' || getDecisionValue(verificationResult) === 'uncertain') && (
                      <p className="text-sm font-medium text-yellow-200">No reward given - Content is {getDecisionValue(verificationResult).toUpperCase()}</p>
                    )}
                    {verificationResult.individual_decisions && verificationResult.individual_decisions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium">Individual Agent Decisions:</p>
                        <div className="space-y-1">
                          {verificationResult.individual_decisions.map((decision, index) => (
                            <div key={index} className="text-xs flex items-center gap-2">
                              <span className="font-medium">{decision.agent_name}:</span>
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {decision.decision.toUpperCase()}
                              </Badge>
                              <span>({Math.round(decision.confidence * 100)}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

            <div className="flex justify-center">
              <InteractiveHoverButton
                onClick={handleVerify}
                disabled={status !== 'idle' || !link.trim()}
                className="w-40 bg-white text-black hover:bg-gray-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {status === 'idle' ? 'Start (1 ALGO)' : getStatusText()}
              </InteractiveHoverButton>
              
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
      </CardContent>
    </Card>
  );
};

export default SmartContractVerificationFlow;
