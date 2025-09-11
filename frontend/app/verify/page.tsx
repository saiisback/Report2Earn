'use client';

import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WalletProvider } from "@/contexts/WalletContext"
import WalletConnection from "@/components/WalletConnection"
import { PlaceholdersAndVanishInput } from "@/components/input-front"
import { useState } from "react"
import { CheckCircle, AlertTriangle, XCircle, Loader2, ExternalLink, Shield } from "lucide-react"

// Type definitions
interface VerificationResult {
  final_decision: {
    value: 'authentic' | 'fake' | 'uncertain';
  };
  confidence: number;
  consensus_score: number;
  group_reasoning: string;
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
}

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

export default function VerifyPage() {
  const [verificationUrl, setVerificationUrl] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);

  const handleVerify = async () => {
    if (!verificationUrl.trim()) return;
    
    setIsVerifying(true);
    try {
      // Call the AI verification API
      const response = await fetch('http://localhost:8000/scrape-and-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: verificationUrl }),
      });
      
      const data = await response.json();
      setVerificationResult(data);
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult({
        success: false,
        error: 'Failed to verify content. Please try again.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getResultIcon = (decision: string) => {
    switch (decision) {
      case 'authentic':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'fake':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getResultColor = (decision: string) => {
    switch (decision) {
      case 'authentic':
        return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'fake':
        return 'bg-red-500/20 border-red-500/30 text-red-400';
      default:
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
    }
  };

  return (
    <WalletProvider>
    <div className="min-h-screen">
        <main className="relative min-h-screen overflow-hidden">
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
            <section className="max-w-4xl mx-auto mb-16">
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="space-y-6 pt-8">
                  <div className="space-y-4">
                    <PlaceholdersAndVanishInput
                      placeholders={[
                        "https://twitter.com/username/status/1234567890",
                        "https://www.instagram.com/p/ABC123/",
                        "https://www.reddit.com/r/technology/comments/abc123/",
                        "https://www.youtube.com/watch?v=ABC123",
                        "https://example.com/news-article"
                      ]}
                      onChange={(e) => setVerificationUrl(e.target.value)}
                      onSubmit={handleVerify}
                    />
                    
                    {isVerifying && (
                      <div className="flex items-center justify-center gap-2 text-white/80">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>AI is analyzing the content...</span>
                      </div>
                    )}
                  </div>

                  {/* Verification Result */}
                  {verificationResult && (
                    <div className="mt-6">
                      {verificationResult.success && verificationResult.result ? (
                        <Alert className={`${getResultColor(verificationResult.result.final_decision?.value || 'uncertain')}`}>
                          <div className="flex items-center gap-3">
                            {getResultIcon(verificationResult.result.final_decision?.value || 'uncertain')}
                            <div className="flex-1">
                              <AlertDescription className="text-lg font-semibold">
                                {(verificationResult.result.final_decision?.value || 'uncertain').toUpperCase()}
                              </AlertDescription>
                              <p className="text-sm opacity-80 mt-1">
                                Confidence: {((verificationResult.result.confidence || 0) * 100).toFixed(1)}% | 
                                Consensus: {((verificationResult.result.consensus_score || 0) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </Alert>
                      ) : (
                        <Alert className="bg-red-500/20 border-red-500/30 text-red-400">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            {verificationResult.error || 'Verification failed'}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Detailed Results */}
                      {verificationResult.success && verificationResult.result && (
                        <div className="mt-4 space-y-4">
                          <div className="bg-white/5 rounded-lg p-4">
                            <h4 className="text-white font-semibold mb-2">AI Analysis</h4>
                            <p className="text-white/80 text-sm">
                              {verificationResult.result.group_reasoning || 'No analysis available'}
                            </p>
                          </div>

                          {verificationResult.scraped_content && (
                            <div className="bg-white/5 rounded-lg p-4">
                              <h4 className="text-white font-semibold mb-2">Scraped Content</h4>
                              <div className="space-y-2">
                                <p className="text-white/80 text-sm">
                                  <strong>Platform:</strong> {verificationResult.scraped_content.platform || 'Unknown'}
                                </p>
                                <p className="text-white/80 text-sm">
                                  <strong>Content:</strong> {(verificationResult.scraped_content.content_text || '').substring(0, 200)}...
                                </p>
                                {verificationResult.scraped_content.url && (
                                  <a 
                                    href={verificationResult.scraped_content.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                                  >
                                    View Original <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>


            {/* Wallet Integration */}
            <section className="max-w-2xl mx-auto">
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm group hover:bg-white/15 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">Connect Wallet</CardTitle>
                  <CardDescription className="text-white/80 text-base">
                    Connect your wallet to access blockchain verification features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WalletConnection />
                </CardContent>
              </Card>
            </section>
          </div>
      </main>
    </div>
    </WalletProvider>
  )
}
