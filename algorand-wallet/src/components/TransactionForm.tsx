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

  // Debug logging
  console.log('TransactionForm render:', { 
    isConnected, 
    address, 
    addressType: typeof address,
    addressLength: address?.length,
    hasSignTransactions: !!signTransactions,
    hasSendTransactions: !!sendTransactions 
  });

  // Safety check
  if (!walletContext) {
    return (
      <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
        Wallet context not available. Please refresh the page.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted:', { isConnected, address, recipient, amount });
    
    if (loading) {
      console.log('Already processing, ignoring submission');
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

    const amountInMicroAlgos = algosToMicroAlgos(parseFloat(amount));
    if (amountInMicroAlgos <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTxId(null);

      console.log('Creating transaction with:', { address, recipient, amountInMicroAlgos });

      // Validate recipient address
      console.log('Validating recipient address:', recipient);
      if (!algosdk.isValidAddress(recipient)) {
        console.error('Invalid recipient address:', recipient);
        setError('Invalid recipient address format');
        return;
      }
      console.log('Recipient address is valid');

      // Get suggested parameters
      const suggestedParams = await algodClient.getTransactionParams().do();
      console.log('Suggested params:', suggestedParams);

      // Create payment transaction using the correct method
      console.log('Creating payment transaction...');
      console.log('Address values:', { 
        from: address, 
        to: recipient, 
        fromType: typeof address, 
        toType: typeof recipient,
        fromLength: address?.length,
        toLength: recipient?.length
      });
      
      // Validate addresses before creating transaction
      if (!address || address.trim() === '') {
        setError('Sender address is missing or invalid');
        return;
      }
      
      if (!recipient || recipient.trim() === '') {
        setError('Recipient address is missing or invalid');
        return;
      }
      
      // Convert BigInt values to numbers and create a clean suggested params object
      const cleanSuggestedParams = {
        flatFee: suggestedParams.flatFee,
        fee: Number(suggestedParams.fee),
        firstValid: Number(suggestedParams.firstValid),
        lastValid: Number(suggestedParams.lastValid),
        genesisID: suggestedParams.genesisID,
        genesisHash: suggestedParams.genesisHash,
      };
      
      console.log('About to call makePaymentTxnWithSuggestedParamsFromObject with params:', {
        from: address.trim(),
        to: recipient.trim(),
        amount: amountInMicroAlgos,
        suggestedParams: cleanSuggestedParams
      });
      
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: address.trim(),
        to: recipient.trim(),
        amount: amountInMicroAlgos,
        suggestedParams: cleanSuggestedParams,
      });
      console.log('Transaction created successfully');

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
