'use client';

import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWalletContext } from "@/contexts/WalletContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  algodClient, 
  algosToMicroAlgos, 
  VERIFICATION_ESCROW_ADDRESS, 
  ESCROW_MNEMONIC
} from "@/lib/algorand"
import algosdk from "algosdk"
import { useMemo, useState } from "react"
import { CheckCircle, AlertTriangle, XCircle, Loader2, ExternalLink, Shield } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Search, ArrowRight, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Type definitions
interface AgentDecision {
  agent_name: string;
  decision: 'authentic' | 'fake' | 'uncertain';
  confidence: number;
  reasoning: string;
  evidence: string[];
}

interface VerificationResult {
  final_decision: {
    value: 'authentic' | 'fake' | 'uncertain';
  };
  confidence: number;
  consensus_score: number;
  group_reasoning: string;
  individual_decisions?: AgentDecision[];
}

interface ScrapedContent {
  platform: string;
  url: string;
  content_text: string;
  content_images: string[];
}

interface VerificationResponse {
  success: boolean;
  result?: VerificationResult;
  scraped_content?: ScrapedContent;
  error?: string;
  // Direct properties from API response
  final_decision?: string | {
    value: 'authentic' | 'fake' | 'uncertain';
  };
  confidence?: number;
  consensus_score?: number;
  group_reasoning?: string;
  // Group decision from API
  group_decision?: {
    final_decision: {
      value: 'authentic' | 'fake' | 'uncertain';
    };
    confidence: number;
    consensus_score: number;
    group_reasoning: string;
    individual_decisions?: AgentDecision[];
  };
}

type VerificationStatus = 'idle' | 'depositing' | 'verifying' | 'refunding' | 'completed' | 'error';

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

export default function VerifyPage() {
  const { isConnected, address, signTransactions, sendTransactions, refreshBalance } = useWalletContext();
  const [verificationUrl, setVerificationUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);
  const [depositTxId, setDepositTxId] = useState<string | null>(null);
  const [refundTxId, setRefundTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progressValue = useMemo(() => {
    if (refundTxId) return 100;
    if (verificationResult) return 70;
    if (depositTxId) return 35;
    return isProcessing ? 15 : 0;
  }, [isProcessing, depositTxId, verificationResult, refundTxId]);

  const handleVerify = async () => {
    if (!verificationUrl.trim()) return;
    
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!signTransactions || !sendTransactions) {
      setError('Wallet functions not available. Please refresh the page.');
      return;
    }

    try {
      setError(null);
      setIsProcessing(true);
      setVerificationResult(null);
      setDepositTxId(null);
      setRefundTxId(null);

      // Step 1: Deposit 1 ALGO to escrow
      const depositAmount = algosToMicroAlgos(1);
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

      const depositTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: VERIFICATION_ESCROW_ADDRESS,
        amount: depositAmount,
        suggestedParams: cleanSuggestedParams,
      });

      const depositTxnBytes = depositTxn.toByte();
      const signedDepositTxn = await signTransactions([depositTxnBytes]);
      const { txId: depositTxId } = await sendTransactions(signedDepositTxn);
      setDepositTxId(depositTxId);

      // Step 2: AI Verification
      const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/scrape-and-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: verificationUrl }),
      });
      
      const data = await apiResponse.json();
      setVerificationResult(data);

      // Step 3: Send reward (2 ALGO total)
      const rewardAmount = algosToMicroAlgos(2);
      const escrowAccount = algosdk.mnemonicToSecretKey(ESCROW_MNEMONIC);
      
      const rewardTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: escrowAccount.addr,
        receiver: address,
        amount: rewardAmount,
        suggestedParams: cleanSuggestedParams,
      });

      const signedRewardTxn = algosdk.signTransaction(rewardTxn, escrowAccount.sk);
      const response = await algodClient.sendRawTransaction(signedRewardTxn.blob).do();
      setRefundTxId(response.txid);
      
      await refreshBalance();
      
    } catch (err: any) {
      console.error('Verification failed:', err);
      setError(err.message || 'Verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getResultIcon = (decision: string) => {
    switch (decision) {
      case 'authentic':
        return <CheckCircle className="h-8 w-8 text-white" />;
      case 'fake':
        return <XCircle className="h-8 w-8 text-white" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-white" />;
    }
  };

  const getResultColor = (decision: string) => {
    switch (decision) {
      case 'authentic':
        return 'bg-green-500/30 border-green-500/50 text-white';
      case 'fake':
        return 'bg-red-500/30 border-red-500/50 text-white';
      default:
        return 'bg-yellow-500/30 border-yellow-500/50 text-white';
    }
  };

  const resetFlow = () => {
    setVerificationUrl('');
    setVerificationResult(null);
    setDepositTxId(null);
    setRefundTxId(null);
    setError(null);
    setIsProcessing(false);
  };


  const getDecisionValue = (): string => {
    if (!verificationResult) return 'uncertain';
    
    // Check group_decision first (from API response)
    if (verificationResult.group_decision?.final_decision?.value) {
      return verificationResult.group_decision.final_decision.value;
    }
    
    // Check direct final_decision
    if (typeof verificationResult.final_decision === 'string') {
      return verificationResult.final_decision;
    }
    
    if (verificationResult.final_decision?.value) {
      return verificationResult.final_decision.value;
    }
    
    // Check result object
    if (verificationResult.result?.final_decision) {
      return typeof verificationResult.result.final_decision === 'string' 
        ? verificationResult.result.final_decision 
        : verificationResult.result.final_decision.value;
    }
    
    return 'uncertain';
  };


  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="relative min-h-screen overflow-hidden pt-20">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />

        <div className="container mx-auto px-4 py-12">
          {/* Refined Header Section */}
          <section className="text-center mb-20">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-6xl md:text-7xl mb-8`}
            >
              Verify before you share
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/90 text-xl mb-12 text-balance max-w-3xl mx-auto leading-relaxed"
            >
              Paste a link to any post, article, or video. We analyze it with multiple AI agents and return a clear verdict. Deposit 1 ALGO to start; receive 2 ALGO back after verification.
            </motion.p>
          </section>

          {/* Enhanced Verification Interface */}
          <section className="max-w-3xl mx-auto mb-20">
            <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center gap-2 text-2xl">
                  <Shield className="h-6 w-6 text-blue-400" />
                  Content verification
                </CardTitle>
                <CardDescription className="text-white/70">
                  Deposit 1 ALGO to begin. After analysis, you receive 2 ALGO back as reward.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-2">
                {/* Input Section */}
                <div className="space-y-6">
                  {/* Sophisticated Input Field */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-white/40" />
                    </div>
                    <input
                      type="text"
                      value={verificationUrl}
                      onChange={(e) => setVerificationUrl(e.target.value)}
                      placeholder="Paste link to the post / article / video"
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-28 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                    <Button
                      onClick={handleVerify}
                      disabled={isProcessing || !verificationUrl}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-500/90 hover:to-purple-500/90 text-white h-9 px-4"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Verifying
                        </>
                      ) : (
                        <>
                          Verify
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Verification Info */}
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          <span>Verification Process</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Deposit 1 ALGO. We refund 2 ALGO after verification.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span>Typical verification time: ~30–60 seconds</span>
                  </div>

                  {/* Progress + Stepper */}
                  <AnimatePresence mode="popLayout">
                    {isProcessing && (
                      <motion.div
                        key="progress"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="space-y-3"
                      >
                        <Progress value={progressValue} className="h-2 bg-white/10" />
                        <div className="grid grid-cols-3 gap-2 text-xs text-white/70">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${depositTxId ? 'bg-green-400' : 'bg-white/40 animate-pulse'}`}></span>
                            Deposit
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${verificationResult ? 'bg-green-400' : depositTxId ? 'bg-blue-300 animate-pulse' : 'bg-white/40'}`}></span>
                            Analyze
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${refundTxId ? 'bg-green-400' : verificationResult ? 'bg-purple-300 animate-pulse' : 'bg-white/40'}`}></span>
                            Reward
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Results Section */}
                <AnimatePresence>
                  {isProcessing && !depositTxId && (
                    <motion.div
                      key="skeleton"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-8 p-6 bg-white/5 rounded-lg border border-white/10 space-y-4"
                    >
                      <Skeleton className="h-5 w-40 bg-white/10" />
                      <Skeleton className="h-4 w-full bg-white/10" />
                      <Skeleton className="h-4 w-5/6 bg-white/10" />
                    </motion.div>
                  )}

                  {verificationResult && (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`mt-8 p-6 rounded-lg border ${getResultColor(getDecisionValue())}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">{getResultIcon(getDecisionValue())}</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-white/20 text-white">
                              {getDecisionValue().toUpperCase()}
                            </Badge>
                            <span className="text-white/90 text-sm">Confidence: {Math.round((verificationResult.confidence || 0) * 100)}%</span>
                            {typeof verificationResult.consensus_score === 'number' && (
                              <span className="text-white/90 text-sm">Consensus: {Math.round((verificationResult.consensus_score || 0) * 100)}%</span>
                            )}
                          </div>
                          {verificationResult.group_reasoning && (
                            <p className="text-white/90">{verificationResult.group_reasoning}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
                            {depositTxId && (
                              <a
                                href={`https://testnet.algoexplorer.io/tx/${depositTxId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-200 hover:text-blue-100"
                              >
                                Deposit TX <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {refundTxId && (
                              <a
                                href={`https://testnet.algoexplorer.io/tx/${refundTxId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-green-200 hover:text-green-100"
                              >
                                Reward TX <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-white"
                  >
                    {error}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
