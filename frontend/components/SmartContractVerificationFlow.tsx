'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { Loader2, ExternalLink, Brain, Shield, CheckCircle, XCircle, AlertTriangle, BarChart3, Users, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import WalletConnection from '@/components/WalletConnection';
import { MultiStepLoader } from '@/components/step-loader';
import { BentoGrid, BentoCard } from '@/components/bentogrid';
import { AnimatePresence, motion } from 'motion/react';
import { useOutsideClick } from '@/hooks/use-outside-click';
import { Confetti, ConfettiButton } from '@/components/confetti';

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
  popularity_score?: number;
  dynamic_reward?: number;
  individual_decisions?: Array<{
    agent_name: string;
    decision: 'authentic' | 'fake' | 'uncertain';
    confidence: number;
    reasoning: string;
    evidence: string[];
  }>;
}

// Type guard to check if verification result is valid
const isValidVerificationResult = (result: any): result is VerificationResult => {
  return result && 
    typeof result === 'object' && 
    'confidence' in result && 
    'group_reasoning' in result &&
    'consensus_score' in result;
};

// CloseIcon component for expandable cards
const CloseIcon = () => {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.05 }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-white"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  );
};

// Loading states for the step loader
const loadingStates = [
  { text: "Connecting to blockchain..." },
  { text: "Depositing 1 ALGO verification fee..." },
  { text: "AI agents analyzing content..." },
  { text: "Analyzing content popularity..." },
  { text: "Cross-referencing multiple sources..." },
  { text: "Generating verification report..." },
  { text: "Calculating dynamic reward..." },
  { text: "Sending reward transaction..." },
  { text: "Verification completed!" },
];

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
  const [showStepLoader, setShowStepLoader] = useState(false);
  const [activeCard, setActiveCard] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<any>(null);

  // Handle expandable card functionality
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveCard(null);
      }
    }

    if (activeCard) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCard]);

  useOutsideClick(cardRef, () => setActiveCard(null));

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

    // Show step loader
    setShowStepLoader(true);

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
      
      // Trigger confetti if content is fake (user gets reward)
      if (finalDecision === 'fake') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
      console.log('AI Verification Result:', {
        decision: finalDecision,
        confidence: verificationResult?.confidence,
        reasoning: verificationResult?.group_reasoning
      });

      // Step 4: Send dynamic reward based on verification result
      // Only send dynamic reward if content is verified as FAKE
      // No reward for authentic or uncertain results
      if (finalDecision === 'fake') {
        setStatus('claiming');
        
        // Calculate dynamic reward
        const dynamicReward = verificationResult?.dynamic_reward || 0.05; // Default to base fee
        const popularityScore = verificationResult?.popularity_score || 0;
        
        toast({
          title: "Content verified as FAKE!",
          description: `Sending ${dynamicReward.toFixed(4)} ALGO reward (popularity: ${(popularityScore * 100).toFixed(1)}%)...`,
          duration: 3000,
        });
        
        try {
          const rewardAmount = algosToMicroAlgos(dynamicReward); // Dynamic reward based on popularity
          
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
            description: `You received ${dynamicReward.toFixed(4)} ALGO for detecting fake content! (Popularity: ${(popularityScore * 100).toFixed(1)}%)`,
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
    } finally {
      // Hide step loader
      setShowStepLoader(false);
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
        return 'Smart contract sending dynamic reward...';
      case 'completed':
        if (verificationResult) {
          const decision = getDecisionValue(verificationResult);
          if (decision === 'fake') {
            const dynamicReward = verificationResult?.dynamic_reward || 0.05;
            const popularityScore = verificationResult?.popularity_score || 0;
            return `Verification completed! Content is FAKE - You received ${dynamicReward.toFixed(4)} ALGO (Popularity: ${(popularityScore * 100).toFixed(1)}%)!`;
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
          <p className="text-white/80 mb-4">Please connect your wallet to start verification</p>
          <div className="flex justify-center items-center">
            <WalletConnection />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Multi Step Loader */}
      <MultiStepLoader 
        loadingStates={loadingStates} 
        loading={showStepLoader} 
        duration={2000} 
      />

      {verificationResult && isValidVerificationResult(verificationResult) ? (
        // Results Display - Expandable Bento Grid
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Verification Results</h2>
            <p className="text-white/80">AI analysis completed successfully</p>
          </div>
          
          {/* Expandable Card Overlay */}
          <AnimatePresence>
            {activeCard && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm h-full w-full z-50"
              />
            )}
          </AnimatePresence>

          {/* Expanded Card */}
          <AnimatePresence>
            {activeCard && (
              <div className="fixed inset-0 grid place-items-center z-[100]">
                <motion.button
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex absolute top-4 right-4 items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full h-10 w-10 z-10 hover:bg-black/60 transition-colors duration-200"
                  onClick={() => setActiveCard(null)}
                >
                  <CloseIcon />
                </motion.button>
                <motion.div
                  layoutId={`card-${activeCard.id}`}
                  ref={cardRef}
                  className={`w-full max-w-[800px] h-full md:h-fit md:max-h-[90%] flex flex-col backdrop-blur-md border rounded-3xl overflow-hidden ${
                    activeCard.decision === 'fake' 
                      ? 'bg-gradient-to-br from-red-500/20 via-red-600/10 to-red-700/20 border-red-400/30' 
                      : activeCard.decision === 'authentic'
                      ? 'bg-gradient-to-br from-green-500/20 via-green-600/10 to-green-700/20 border-green-400/30'
                      : 'bg-gradient-to-br from-yellow-500/20 via-yellow-600/10 to-yellow-700/20 border-yellow-400/30'
                  }`}
                >
                  <motion.div 
                    layoutId={`image-${activeCard.id}`}
                    className={`h-32 w-full ${
                      activeCard.decision === 'fake' 
                        ? 'bg-gradient-to-r from-red-500/30 via-red-600/20 to-red-700/30' 
                        : activeCard.decision === 'authentic'
                        ? 'bg-gradient-to-r from-green-500/30 via-green-600/20 to-green-700/30'
                        : 'bg-gradient-to-r from-yellow-500/30 via-yellow-600/20 to-yellow-700/30'
                    } flex items-center justify-center relative`}
                  >
                    {activeCard.Icon && <activeCard.Icon className="h-16 w-16 text-white drop-shadow-lg" />}
                    {/* Decorative background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-4 left-4 w-8 h-8 border border-white/30 rounded-full"></div>
                      <div className="absolute top-8 right-8 w-4 h-4 border border-white/30 rounded-full"></div>
                      <div className="absolute bottom-6 left-8 w-6 h-6 border border-white/30 rounded-full"></div>
                    </div>
                  </motion.div>

                  <div className="p-6 bg-black/20 backdrop-blur-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <motion.h3
                          layoutId={`title-${activeCard.id}`}
                          className="font-bold text-white text-2xl mb-2"
                        >
                          {activeCard.name}
                        </motion.h3>
                        <motion.p
                          layoutId={`description-${activeCard.id}`}
                          className="text-white/90 text-base"
                        >
                          {activeCard.description}
                        </motion.p>
                      </div>
                    </div>
                    
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-white/90 text-sm leading-relaxed max-h-96 overflow-auto"
                    >
                      {activeCard.content}
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Confetti Effect */}
          {showConfetti && (
            <Confetti
              ref={confettiRef}
              options={{
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'],
                shapes: ['star', 'circle'],
                scalar: 1.2,
              }}
            />
          )}

          {/* Bento Grid with Expandable Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Main Result Card */}
            <motion.div
              layoutId={`card-main-result`}
              onClick={() => setActiveCard({
                id: 'main-result',
                name: 'Verification Result',
                description: `Content verified as ${getDecisionValue(verificationResult).toUpperCase()} with ${Math.round(verificationResult.confidence * 100)}% confidence`,
                decision: getDecisionValue(verificationResult),
                Icon: getDecisionValue(verificationResult) === 'fake' ? XCircle : 
                      getDecisionValue(verificationResult) === 'authentic' ? CheckCircle : AlertTriangle,
                content: (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Final Decision</h4>
                      <p className="text-white/80">{getDecisionValue(verificationResult).toUpperCase()}</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Confidence Score</h4>
                      <p className="text-white/80">{Math.round(verificationResult.confidence * 100)}%</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Consensus Score</h4>
                      <p className="text-white/80">{Math.round(verificationResult.consensus_score * 100)}%</p>
                    </div>
                    {getDecisionValue(verificationResult) === 'fake' && (
                      <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg backdrop-blur-sm border border-green-500/30">
                        <h4 className="text-green-200 font-semibold mb-2">🎉 Dynamic Reward Earned!</h4>
                        <p className="text-green-100 text-sm">
                          You've earned {verificationResult?.dynamic_reward?.toFixed(4) || '0.0500'} ALGO for identifying fake content!
                        </p>
                        <p className="text-green-200 text-xs mt-1">
                          Popularity Score: {((verificationResult?.popularity_score || 0) * 100).toFixed(1)}% | 
                          Base Fee: 0.05 ALGO | 
                          Multiplier: {verificationResult?.dynamic_reward ? (verificationResult.dynamic_reward / 0.05).toFixed(2) : '1.00'}x
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
              className={`col-span-2 p-8 rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden group ${
                getDecisionValue(verificationResult) === 'fake' 
                  ? 'bg-gradient-to-br from-red-500/30 via-red-600/20 to-red-700/30 border border-red-400/40 shadow-red-500/20' 
                  : getDecisionValue(verificationResult) === 'authentic'
                  ? 'bg-gradient-to-br from-green-500/30 via-green-600/20 to-green-700/30 border border-green-400/40 shadow-green-500/20'
                  : 'bg-gradient-to-br from-yellow-500/30 via-yellow-600/20 to-yellow-700/30 border border-yellow-400/40 shadow-yellow-500/20'
              }`}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Animated background gradient */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                getDecisionValue(verificationResult) === 'fake' 
                  ? 'bg-gradient-to-br from-red-400/20 to-red-600/20' 
                  : getDecisionValue(verificationResult) === 'authentic'
                  ? 'bg-gradient-to-br from-green-400/20 to-green-600/20'
                  : 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20'
              }`} />
              
              <motion.div 
                layoutId={`image-main-result`}
                className={`h-24 w-24 rounded-2xl mb-6 flex items-center justify-center relative z-10 ${
                  getDecisionValue(verificationResult) === 'fake' 
                    ? 'bg-gradient-to-br from-red-500/40 to-red-600/40 shadow-lg shadow-red-500/30' 
                    : getDecisionValue(verificationResult) === 'authentic'
                    ? 'bg-gradient-to-br from-green-500/40 to-green-600/40 shadow-lg shadow-green-500/30'
                    : 'bg-gradient-to-br from-yellow-500/40 to-yellow-600/40 shadow-lg shadow-yellow-500/30'
                }`}
                whileHover={{ rotate: 5, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {getDecisionValue(verificationResult) === 'fake' ? <XCircle className="h-12 w-12 text-white drop-shadow-lg" /> : 
                 getDecisionValue(verificationResult) === 'authentic' ? <CheckCircle className="h-12 w-12 text-white drop-shadow-lg" /> : 
                 <AlertTriangle className="h-12 w-12 text-white drop-shadow-lg" />}
              </motion.div>
              
              <motion.h3
                layoutId={`title-main-result`}
                className="font-bold text-white text-2xl mb-3 relative z-10"
              >
                Verification Result
              </motion.h3>
              <motion.p
                layoutId={`description-main-result`}
                className="text-white/90 text-base leading-relaxed relative z-10"
              >
                Content verified as <span className="font-semibold">{getDecisionValue(verificationResult).toUpperCase()}</span> with <span className="font-semibold text-yellow-300">{Math.round(verificationResult.confidence * 100)}%</span> confidence
              </motion.p>
              
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                {getDecisionValue(verificationResult) === 'fake' ? <XCircle className="h-8 w-8 text-white" /> : 
                 getDecisionValue(verificationResult) === 'authentic' ? <CheckCircle className="h-8 w-8 text-white" /> : 
                 <AlertTriangle className="h-8 w-8 text-white" />}
              </div>
            </motion.div>

            {/* AI Group Analysis Card */}
            <motion.div
              layoutId={`card-group-analysis`}
              onClick={() => setActiveCard({
                id: 'group-analysis',
                name: 'AI Group Analysis',
                description: 'Group Decision: FAKE | Consensus: 4 fake, 0 authentic, 0 uncertain',
                decision: 'fake',
                Icon: Brain,
                content: (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Group Decision</h4>
                      <p className="text-white/80">FAKE</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Consensus</h4>
                      <p className="text-white/80">4 fake, 0 authentic, 0 uncertain</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Successful Models</h4>
                      <p className="text-white/80">4/4</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Confidence Weighted</h4>
                      <p className="text-white/80">Fake: 3.45, Authentic: 0.00</p>
                    </div>
                  </div>
                )
              })}
              className="col-span-1 p-6 rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden group bg-gradient-to-br from-blue-500/30 via-indigo-600/20 to-purple-700/30 border border-blue-400/40 shadow-blue-500/20"
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-400/20 to-purple-600/20" />
              
              <motion.div 
                layoutId={`image-group-analysis`}
                className="h-20 w-20 rounded-2xl mb-4 flex items-center justify-center relative z-10 bg-gradient-to-br from-blue-500/40 to-indigo-600/40 shadow-lg shadow-blue-500/30"
                whileHover={{ rotate: 5, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Brain className="h-10 w-10 text-white drop-shadow-lg" />
              </motion.div>
              
              <motion.h3
                layoutId={`title-group-analysis`}
                className="font-bold text-white text-xl mb-3 relative z-10"
              >
                AI Group Analysis
              </motion.h3>
              <motion.p
                layoutId={`description-group-analysis`}
                className="text-white/90 text-sm leading-relaxed relative z-10"
              >
                Group Decision: <span className="font-semibold text-red-300">FAKE</span> | Consensus: 4 fake, 0 authentic, 0 uncertain
              </motion.p>
              
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                <Brain className="h-6 w-6 text-white" />
              </div>
            </motion.div>

            {/* Popularity Analysis Card */}
            <motion.div
              layoutId={`card-popularity-analysis`}
              onClick={() => setActiveCard({
                id: 'popularity-analysis',
                name: 'Popularity Analysis',
                description: `Popularity Score: ${((verificationResult?.popularity_score || 0) * 100).toFixed(1)}% | Dynamic Reward: ${verificationResult?.dynamic_reward?.toFixed(4) || '0.0500'} ALGO`,
                decision: 'fake',
                Icon: BarChart3,
                content: (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Popularity Score</h4>
                      <p className="text-white/80">{((verificationResult?.popularity_score || 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Dynamic Reward</h4>
                      <p className="text-white/80">{verificationResult?.dynamic_reward?.toFixed(4) || '0.0500'} ALGO</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Base Fee</h4>
                      <p className="text-white/80">0.05 ALGO</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <h4 className="text-white font-semibold mb-2">Multiplier</h4>
                      <p className="text-white/80">{verificationResult?.dynamic_reward ? (verificationResult.dynamic_reward / 0.05).toFixed(2) : '1.00'}x</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg backdrop-blur-sm border border-purple-500/30">
                      <h4 className="text-purple-200 font-semibold mb-2">💡 How it works</h4>
                      <p className="text-purple-100 text-sm">Higher popularity content gets higher rewards when detected as fake. Base fee (0.05 ALGO) × popularity multiplier (1.0x - 5.0x)</p>
                    </div>
                  </div>
                )
              })}
              className="col-span-1 p-6 rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden group bg-gradient-to-br from-purple-500/30 via-pink-600/20 to-rose-700/30 border border-purple-400/40 shadow-purple-500/20"
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-purple-400/20 to-pink-600/20" />
              
              <motion.div 
                layoutId={`image-popularity-analysis`}
                className="h-20 w-20 rounded-2xl mb-4 flex items-center justify-center relative z-10 bg-gradient-to-br from-purple-500/40 to-pink-600/40 shadow-lg shadow-purple-500/30"
                whileHover={{ rotate: 5, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <BarChart3 className="h-10 w-10 text-white drop-shadow-lg" />
              </motion.div>
              
              <motion.h3
                layoutId={`title-popularity-analysis`}
                className="font-bold text-white text-xl mb-3 relative z-10"
              >
                Popularity Analysis
              </motion.h3>
              <motion.p
                layoutId={`description-popularity-analysis`}
                className="text-white/90 text-sm leading-relaxed relative z-10"
              >
                Score: <span className="font-semibold text-purple-300">{((verificationResult?.popularity_score || 0) * 100).toFixed(1)}%</span> | 
                Reward: <span className="font-semibold text-green-300">{verificationResult?.dynamic_reward?.toFixed(4) || '0.0500'} ALGO</span>
              </motion.p>
              
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </motion.div>

            {/* Individual Agent Analysis Cards */}
            {verificationResult.individual_decisions && verificationResult.individual_decisions.map((decision: any, index: number) => (
              <motion.div
                key={index}
                layoutId={`card-agent-${index}`}
                onClick={() => setActiveCard({
                  id: `agent-${index}`,
                  name: decision.agent_name,
                  description: `${decision.decision.toUpperCase()} (${Math.round(decision.confidence * 100)}%)`,
                  decision: decision.decision,
                  Icon: decision.decision === 'fake' ? XCircle : 
                        decision.decision === 'authentic' ? CheckCircle : AlertTriangle,
                  content: (
                    <div className="space-y-4">
                      <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                        <h4 className="text-white font-semibold mb-2">Decision</h4>
                        <p className="text-white/80">{decision.decision.toUpperCase()}</p>
                      </div>
                      <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                        <h4 className="text-white font-semibold mb-2">Confidence</h4>
                        <p className="text-white/80">{Math.round(decision.confidence * 100)}%</p>
                      </div>
                      <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                        <h4 className="text-white font-semibold mb-2">Reasoning</h4>
                        <p className="text-white/80 text-sm leading-relaxed">{decision.reasoning}</p>
                      </div>
                      {decision.evidence && decision.evidence.length > 0 && (
                        <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                          <h4 className="text-white font-semibold mb-2">Evidence</h4>
                          <ul className="space-y-1">
                            {decision.evidence.map((evidence: string, idx: number) => (
                              <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
                                <span className="text-white/60 mt-1">•</span>
                                <span>{evidence}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
                className={`p-6 rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden group ${
                  decision.decision === 'fake' 
                    ? 'bg-gradient-to-br from-red-500/30 via-red-600/20 to-red-700/30 border border-red-400/40 shadow-red-500/20' 
                    : decision.decision === 'authentic'
                    ? 'bg-gradient-to-br from-green-500/30 via-green-600/20 to-green-700/30 border border-green-400/40 shadow-green-500/20'
                    : 'bg-gradient-to-br from-yellow-500/30 via-yellow-600/20 to-yellow-700/30 border border-yellow-400/40 shadow-yellow-500/20'
                }`}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Animated background gradient */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  decision.decision === 'fake' 
                    ? 'bg-gradient-to-br from-red-400/20 to-red-600/20' 
                    : decision.decision === 'authentic'
                    ? 'bg-gradient-to-br from-green-400/20 to-green-600/20'
                    : 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20'
                }`} />
                
                <motion.div 
                  layoutId={`image-agent-${index}`}
                  className={`h-16 w-16 rounded-2xl mb-4 flex items-center justify-center relative z-10 ${
                    decision.decision === 'fake' 
                      ? 'bg-gradient-to-br from-red-500/40 to-red-600/40 shadow-lg shadow-red-500/30' 
                      : decision.decision === 'authentic'
                      ? 'bg-gradient-to-br from-green-500/40 to-green-600/40 shadow-lg shadow-green-500/30'
                      : 'bg-gradient-to-br from-yellow-500/40 to-yellow-600/40 shadow-lg shadow-yellow-500/30'
                  }`}
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {decision.decision === 'fake' ? <XCircle className="h-8 w-8 text-white drop-shadow-lg" /> : 
                   decision.decision === 'authentic' ? <CheckCircle className="h-8 w-8 text-white drop-shadow-lg" /> : 
                   <AlertTriangle className="h-8 w-8 text-white drop-shadow-lg" />}
                </motion.div>
                
                <motion.h3
                  layoutId={`title-agent-${index}`}
                  className="font-bold text-white text-lg mb-2 relative z-10"
                >
                  {decision.agent_name}
                </motion.h3>
                <motion.p
                  layoutId={`description-agent-${index}`}
                  className="text-white/90 text-sm leading-relaxed relative z-10"
                >
                  <span className={`font-semibold ${
                    decision.decision === 'fake' ? 'text-red-300' : 
                    decision.decision === 'authentic' ? 'text-green-300' : 'text-yellow-300'
                  }`}>
                    {decision.decision.toUpperCase()}
                  </span> 
                  <span className="text-yellow-300 font-semibold"> ({Math.round(decision.confidence * 100)}%)</span> - {decision.reasoning.substring(0, 80)}...
                </motion.p>
                
                {/* Confidence indicator */}
                <div className="mt-3 relative z-10">
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <motion.div 
                      className={`h-2 rounded-full ${
                        decision.decision === 'fake' ? 'bg-red-400' : 
                        decision.decision === 'authentic' ? 'bg-green-400' : 'bg-yellow-400'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${decision.confidence * 100}%` }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                    />
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                  {decision.decision === 'fake' ? <XCircle className="h-5 w-5 text-white" /> : 
                   decision.decision === 'authentic' ? <CheckCircle className="h-5 w-5 text-white" /> : 
                   <AlertTriangle className="h-5 w-5 text-white" />}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <Button
              onClick={resetFlow}
              variant="outline"
              className="border-white/20 text-black hover:bg-white/10 hover:text-white"
            >
              Verify Another Link
            </Button>
          </div>
        </div>
      ) : (
        // Input Form
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
                {status === 'idle' ? 'Verify (1 ALGO)' : getStatusText()}
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
      )}
    </>
  );
};

export default SmartContractVerificationFlow;