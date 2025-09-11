'use client';

import WalletConnection from '@/components/WalletConnection';
import TransactionForm from '@/components/TransactionForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Algorand Wallet
          </h1>
          <p className="text-lg text-gray-600">
            Connect your Pera Wallet and send ALGO transactions
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Wallet Connection
            </h2>
            <WalletConnection />
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Send Transaction
            </h2>
            <TransactionForm />
          </div>
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            How to use:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Click "Connect Pera Wallet" to connect your wallet</li>
            <li>Once connected, you'll see your address and balance</li>
            <li>Enter a recipient address and amount to send ALGO</li>
            <li>Click "Send ALGO" to initiate the transaction</li>
            <li>Confirm the transaction in your Pera Wallet</li>
          </ol>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This app connects to Algorand Testnet. Make sure you're using testnet ALGO.</p>
        </div>
      </div>
    </div>
  );
}
