'use client';

import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWalletContext } from "@/contexts/WalletContext"
import { PlaceholdersAndVanishInput } from "@/components/input-front"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { algodClient, algosToMicroAlgos, VERIFICATION_ESCROW_ADDRESS, ESCROW_MNEMONIC } from "@/lib/algorand"
import algosdk from "algosdk"
import { useState } from "react"
import { CheckCircle, AlertTriangle, XCircle, Loader2, ExternalLink, Shield } from "lucide-react"

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
      const apiResponse = await fetch('http://localhost:8000/scrape-and-verify', {
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
          {/* Header Section */}
          <section className="text-center mb-20">
            <h1
              className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-6xl md:text-7xl mb-8`}
            >
              Verify Before You Share
            </h1>
            <p className="text-white/90 text-xl mb-12 text-balance max-w-3xl mx-auto leading-relaxed">
              Stop the spread of misinformation. Our AI-powered verification system analyzes content across multiple platforms and provides instant, trustworthy results.
            </p>
          </section>

          {/* Main Verification Section */}
          <section className="max-w-5xl mx-auto mb-20">
            <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-2xl">
              <CardContent className="space-y-8 pt-12 pb-12">
                <div className="text-center mb-8">
                  <h2 className="text-white text-3xl font-semibold mb-4">Enter Content URL</h2>
                  <p className="text-white/70 text-lg max-w-2xl mx-auto">
                    Paste any link from social media, news sites, or other platforms for instant AI verification
                  </p>
                </div>
                
                <div className="space-y-6">
                  <PlaceholdersAndVanishInput
                    placeholders={[
                      "AI is analyzing the content for authenticity...",
                      "Checking sources and cross-referencing data...",
                      "Scanning for manipulation indicators...",
                      "Verifying claims against trusted databases...",
                      "Running consensus analysis across AI models...",
                      "Finalizing verification results..."
                    ]}
                    onChange={(e) => setVerificationUrl(e.target.value)}
                    onSubmit={handleVerify}
                  />
                  
                  {/* Processing State */}
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-3 text-white/90 bg-white/5 rounded-lg p-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-lg">Processing verification...</span>
                    </div>
                  )}

                  {/* Error Display */}
                  {error && (
                    <Alert className="border-red-500 bg-red-500/10">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-200">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Transaction Status */}
                  {depositTxId && (
                    <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-200 text-sm">1 ALGO deposited</span>
                      </div>
                      <a
                        href={`https://testnet.algoexplorer.io/tx/${depositTxId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:text-blue-100 text-xs"
                      >
                        View TX
                      </a>
                    </div>
                  )}

                  {refundTxId && (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-green-200 text-sm">2 ALGO reward received</span>
                      </div>
                      <a
                        href={`https://testnet.algoexplorer.io/tx/${refundTxId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-300 hover:text-green-100 text-xs"
                      >
                        View TX
                      </a>
                    </div>
                  )}

                  {/* Reset Button */}
                  {(verificationResult || error) && (
                    <div className="flex justify-center">
                      <Button
                        onClick={resetFlow}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <span className="text-white">Try Another URL</span>
                      </Button>
                    </div>
                  )}

                </div>

                {/* Verification Result */}
                {verificationResult && (
                  <div className="mt-8 space-y-6">
                    {/* Main Result Display */}
                    <div className="space-y-4">
                      <div className={`${getResultColor(getDecisionValue())} border-2 rounded-lg p-6`}>
                        <div className="flex items-center gap-4">
                          <div className="text-white">
                          {getResultIcon(getDecisionValue())}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white text-2xl font-bold mb-2">
                              {getDecisionValue().toUpperCase()}
                            </h3>
                            <div className="flex gap-6 text-white/90 text-sm">
                              <span className="bg-white/10 px-3 py-1 rounded-full">
                                Confidence: {((verificationResult.group_decision?.confidence || verificationResult.confidence || verificationResult.result?.confidence || 0) * 100).toFixed(1)}%
                              </span>
                              <span className="bg-white/10 px-3 py-1 rounded-full">
                                Consensus: {((verificationResult.group_decision?.consensus_score || verificationResult.consensus_score || verificationResult.result?.consensus_score || 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Results */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                          <Shield className="h-5 w-5 text-white" />
                          AI Analysis
                        </h4>
                        <div className="text-white/80 text-sm leading-relaxed space-y-3">
                          {/* Process and display group reasoning */}
                          {verificationResult.group_decision?.group_reasoning ? (
                            <div>
                              <p className="font-medium text-white mb-2">AI Analysis Summary:</p>
                              <div className="bg-white/5 p-4 rounded-lg">
                                <p className="text-white/90 mb-3">
                                  {verificationResult.group_decision.group_reasoning.split('\n').map((line, index) => {
                                    if (line.includes('Group Decision:')) {
                                      return (
                                        <div key={index} className="font-bold text-lg mb-2 text-white">
                                          {line.replace('Group Decision:', 'Final Decision:')}
                                        </div>
                                      );
                                    }
                                    if (line.includes('Consensus Score:')) {
                                      return (
                                        <div key={index} className="text-white/80 mb-3">
                                          {line}
                                        </div>
                                      );
                                    }
                                    if (line.includes('Individual Agent Analysis:')) {
                                      return null; // Skip this line as we handle it separately
                                    }
                                    if (line.trim() === '') {
                                      return <br key={index} />;
                                    }
                                    return (
                                      <p key={index} className="text-white/80 mb-2">
                                        {line}
                                      </p>
                                    );
                                  })}
                                </p>
                              </div>
                            </div>
                          ) : verificationResult.group_reasoning ? (
                            <div>
                              <p className="font-medium text-white mb-2">Analysis:</p>
                              <p className="bg-white/5 p-3 rounded-lg">
                                {verificationResult.group_reasoning}
                              </p>
                            </div>
                          ) : verificationResult.result?.group_reasoning ? (
                            <div>
                              <p className="font-medium text-white mb-2">Analysis:</p>
                              <p className="bg-white/5 p-3 rounded-lg">
                                {verificationResult.result.group_reasoning}
                              </p>
                            </div>
                          ) : (
                            <p className="text-white/60 italic">No detailed analysis available</p>
                          )}
                          
                          {/* Individual Model Decisions - Processed and formatted */}
                          {verificationResult.group_decision?.individual_decisions && (
                            <div className="mt-4">
                              <p className="font-medium text-white mb-3">AI Model Analysis:</p>
                              <div className="space-y-3">
                                {verificationResult.group_decision.individual_decisions.map((decision: AgentDecision, index: number) => {
                                  // Check if this is an error response
                                  const isError = decision.reasoning.includes('Error code:') || 
                                                decision.reasoning.includes('failed:') ||
                                                decision.reasoning.includes('User not found') ||
                                                decision.reasoning.includes('Rate limit exceeded');
                                  
                                  return (
                                    <div key={index} className={`p-4 rounded-lg ${
                                      isError ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'
                                    }`}>
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="text-white font-medium text-sm">
                                          {decision.agent_name.replace('Model: ', '')}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                          isError ? 'bg-red-500/20 text-red-400' :
                                          decision.decision === 'authentic' ? 'bg-green-500/20 text-green-400' :
                                          decision.decision === 'fake' ? 'bg-red-500/20 text-red-400' :
                                          'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                          {isError ? 'ERROR' : decision.decision.toUpperCase()}
                                        </span>
                                        {!isError && (
                                          <span className="text-white/60 text-xs">
                                            {(decision.confidence * 100).toFixed(0)}% confidence
                                          </span>
                                        )}
                                      </div>
                                      
                                      {isError ? (
                                        <div className="text-red-300 text-xs">
                                          <p className="font-medium mb-1">⚠️ Model temporarily unavailable</p>
                                          <p className="text-red-400/80">
                                            {decision.reasoning.includes('User not found') ? 
                                              'Authentication issue - please try again later' :
                                              decision.reasoning.includes('Rate limit exceeded') ?
                                              'Daily limit reached - please try again tomorrow' :
                                              'Service temporarily unavailable'
                                            }
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-white/70 text-xs leading-relaxed">
                                          {decision.reasoning}
                                        </p>
                                      )}
                                      
                                      {decision.evidence && decision.evidence.length > 0 && (
                                        <div className="mt-2">
                                          <p className="text-white/60 text-xs font-medium mb-1">Evidence:</p>
                                          <ul className="text-white/60 text-xs space-y-1">
                                            {decision.evidence.map((evidence: string, evidenceIndex: number) => (
                                              <li key={evidenceIndex} className="flex items-start gap-2">
                                                <span className="text-white/40">•</span>
                                                <span>{evidence}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {verificationResult.scraped_content && (
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                          <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <ExternalLink className="h-5 w-5 text-white" />
                            Source Content
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-white/60 text-sm font-medium">Platform:</span>
                              <span className="text-white text-sm bg-white/10 px-2 py-1 rounded">
                                {verificationResult.scraped_content.platform || 'Unknown'}
                              </span>
                            </div>
                            <div>
                              <p className="text-white/60 text-sm font-medium mb-1">Content Preview:</p>
                              <p className="text-white/80 text-sm leading-relaxed bg-white/5 p-3 rounded-lg">
                                {(verificationResult.scraped_content.content_text || '').substring(0, 200)}
                                {(verificationResult.scraped_content.content_text || '').length > 200 ? '...' : ''}
                              </p>
                            </div>
                            {verificationResult.scraped_content.url && (
                              <a 
                                href={verificationResult.scraped_content.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                              >
                                View Original Source <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

        </div>
      </main>
    </div>
  )
}
