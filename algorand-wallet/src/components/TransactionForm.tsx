'use client';

import React, { useState } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { algodClient, algosToMicroAlgos } from '@/lib/algorand';
import algosdk from 'algosdk';

const TransactionForm: React.FC = () => {
  const walletContext = useWalletContext();
  const { isConnected, address, signTransactions, sendTransactions, refreshBalance } = walletContext;
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!walletContext) {
    return (
      <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
        Wallet context not available. Please refresh the page.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!signTransactions || !sendTransactions) {
      setError('Wallet functions not available. Please refresh the page.');
      return;
    }

    if (!recipient || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (!algosdk.isValidAddress(recipient)) {
      setError('Invalid recipient address format');
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

      console.log('Creating transaction...');
      // Use the correct method that exists in the SDK
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: recipient,
        amount: amountInMicroAlgos,
        suggestedParams: cleanSuggestedParams,
      });
      console.log('Transaction created successfully');
      console.log('Transaction object:', txn);
      console.log('Transaction type:', typeof txn);
      console.log('Transaction methods:', Object.getOwnPropertyNames(txn));

      // Sign transaction
      console.log('Signing transaction...');
      const txnBytes = txn.toByte();
      console.log('Transaction bytes created, length:', txnBytes.length);
      const signedTxn = await signTransactions([txnBytes]);
      console.log('Transaction signed successfully');

      // Send transaction
      console.log('Sending transaction to network...');
      const { txId: transactionId } = await sendTransactions(signedTxn);
      console.log('Transaction sent successfully:', transactionId);
      
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
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              recipient && !algosdk.isValidAddress(recipient) 
                ? 'border-red-300 bg-red-50' 
                : recipient && algosdk.isValidAddress(recipient)
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {recipient && !algosdk.isValidAddress(recipient) && (
            <p className="text-xs text-red-600 mt-1">Invalid address format</p>
          )}
          {recipient && algosdk.isValidAddress(recipient) && (
            <p className="text-xs text-green-600 mt-1">✓ Valid address</p>
          )}
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
            <a 
              href={`https://testnet.algoexplorer.io/tx/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 block"
            >
              View on Algorand Explorer →
            </a>
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
