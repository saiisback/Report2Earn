'use client';

import React, { useState } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { algodClient, algosToMicroAlgos } from '@/lib/algorand';
import algosdk from 'algosdk';

const TransactionForm: React.FC = () => {
  const { isConnected, address, signTransactions, sendTransactions, refreshBalance } = useWalletContext();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!recipient || !amount) {
      setError('Please fill in all fields');
      return;
    }

    const amountInMicroAlgos = algosToMicroAlgos(parseFloat(amount));
    if (amountInMicroAlgos <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTxId(null);

      // Get suggested parameters
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: address,
        to: recipient,
        amount: amountInMicroAlgos,
        suggestedParams,
      });

      // Sign transaction
      const signedTxn = await signTransactions([txn.toByte()]);

      // Send transaction
      const { txId: transactionId } = await sendTransactions(signedTxn);
      
      setTxId(transactionId);
      setRecipient('');
      setAmount('');
      
      // Refresh balance
      await refreshBalance();
      
    } catch (err: any) {
      console.error('Transaction failed:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-100 rounded-lg p-6 max-w-md mx-auto text-center">
        <p className="text-gray-600">Please connect your wallet to send transactions</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Send ALGO</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-gray-600 mb-1">
            Recipient Address
          </label>
          <input
            type="text"
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter Algorand address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-600 mb-1">
            Amount (ALGO)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.000001"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {txId && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            <p className="font-medium">Transaction successful!</p>
            <p className="text-xs mt-1">Transaction ID: {txId}</p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
        >
          {loading ? 'Sending...' : 'Send ALGO'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
