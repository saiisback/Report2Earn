# Algorand Wallet - Next.js App

A simple Next.js application that connects to the Algorand blockchain using Pera Wallet for basic ALGO transactions.

## Features

- 🔗 Connect to Pera Wallet
- 💰 View wallet balance
- 📤 Send ALGO transactions
- 🎨 Modern UI with Tailwind CSS
- 🔒 Secure transaction signing

## Prerequisites

- Node.js 18+ installed
- Pera Wallet browser extension installed
- Testnet ALGO for testing (get from [Algorand Testnet Faucet](https://testnet.algoexplorer.io/dispenser))

## Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd algorand-wallet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   The `.env.local` file is already configured with testnet settings. You can modify it if needed:
   ```
   NEXT_PUBLIC_ALGOD_TOKEN=
   NEXT_PUBLIC_ALGOD_SERVER=https://testnet-api.algonode.cloud
   NEXT_PUBLIC_ALGOD_PORT=443
   NEXT_PUBLIC_INDEXER_TOKEN=
   NEXT_PUBLIC_INDEXER_SERVER=https://testnet-idx.algonode.cloud
   NEXT_PUBLIC_INDEXER_PORT=443
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Connect Wallet**: Click "Connect Pera Wallet" to connect your wallet
2. **View Balance**: Once connected, you'll see your wallet address and ALGO balance
3. **Send ALGO**: Enter a recipient address and amount, then click "Send ALGO"
4. **Confirm Transaction**: Approve the transaction in your Pera Wallet popup

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with WalletProvider
│   ├── page.tsx            # Main page component
│   └── globals.css         # Global styles
├── components/
│   ├── WalletConnection.tsx # Wallet connection component
│   └── TransactionForm.tsx  # Transaction form component
├── contexts/
│   └── WalletContext.tsx   # Wallet context and provider
└── lib/
    └── algorand.ts         # Algorand SDK configuration and utilities
```

## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Algorand SDK** - Blockchain interaction
- **@txnlab/use-wallet-react** - Wallet connection management
- **@perawallet/connect** - Pera Wallet integration

## Network Configuration

This app is configured to use the Algorand Testnet by default. To switch to Mainnet:

1. Update the environment variables in `.env.local`
2. Change the server URLs to mainnet endpoints
3. Make sure you're using mainnet ALGO

## Security Notes

- This app is for demonstration purposes
- Always verify transaction details before confirming
- Never share your private keys or seed phrases
- Use testnet for development and testing

## Troubleshooting

- **Wallet not connecting**: Make sure Pera Wallet extension is installed and unlocked
- **Transaction failed**: Check that you have sufficient ALGO balance and the recipient address is valid
- **Network errors**: Verify your internet connection and the Algorand network status

## License

MIT License - feel free to use this code for your own projects!