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
import SmartContractVerificationFlow from "@/components/SmartContractVerificationFlow"
import { 
  algodClient, 
  algosToMicroAlgos, 
  VERIFICATION_ESCROW_ADDRESS, 
  ESCROW_MNEMONIC
} from "@/lib/algorand"
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

          {/* Smart Contract Verification Section */}
          <section className="max-w-5xl mx-auto mb-20">
            <SmartContractVerificationFlow />
          </section>


        </div>
      </main>
    </div>
  )
}
