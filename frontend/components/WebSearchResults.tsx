'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Search, Globe, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance_score: number;
}

interface WebSearchResultsProps {
  searchResults: WebSearchResult[];
  isLoading?: boolean;
}

const WebSearchResults: React.FC<WebSearchResultsProps> = ({ 
  searchResults, 
  isLoading = false 
}) => {

  if (isLoading) {
    return (
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="h-5 w-5" />
            Web Search Analysis
          </CardTitle>
          <CardDescription className="text-white/80">
            Searching for fact-checking information...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-full mb-1"></div>
                <div className="h-3 bg-white/10 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle different data structures and null/undefined cases
  const results = Array.isArray(searchResults) ? searchResults : [];
  const hasResults = results.length > 0;

  if (!hasResults) {
    return (
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="h-5 w-5" />
            Web Search Analysis
          </CardTitle>
          <CardDescription className="text-white/80">
            {searchResults === null || searchResults === undefined 
              ? "Web search in progress..." 
              : "No web search results available"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-white/60">
              {searchResults === null || searchResults === undefined 
                ? "Searching for fact-checking sources..." 
                : "No additional fact-checking sources found"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Search className="h-5 w-5" />
          Web Search Analysis
        </CardTitle>
        <CardDescription className="text-white/80">
          Found {results.length} fact-checking sources
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.map((result, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-white font-semibold text-sm leading-tight flex-1 mr-2">
                  {result.title || 'No title available'}
                </h4>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge 
                    variant="outline" 
                    className="text-xs border-white/30 text-white/80"
                  >
                    {Math.round((result.relevance_score || 0) * 100)}% match
                  </Badge>
                  <a
                    href={result.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
              
              <p className="text-white/70 text-sm leading-relaxed mb-2">
                {result.snippet || 'No snippet available'}
              </p>
              
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Globe className="h-3 w-3" />
                <span>{result.source || 'Unknown source'}</span>
                <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                <span>Relevance: {Math.round((result.relevance_score || 0) * 100)}%</span>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-blue-400" />
            <span className="text-blue-200 font-medium text-sm">AI Analysis Enhanced</span>
          </div>
          <p className="text-blue-100 text-xs leading-relaxed">
            These search results were used by our AI agents to make more accurate verification decisions. 
            The agents cross-referenced the content against these sources to provide you with reliable results.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebSearchResults;
