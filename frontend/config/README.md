# Network Configuration Guide

This guide explains how to configure your frontend application for different Algorand networks (testnet and mainnet).

## Environment Variables

Create a `.env.local` file in the frontend root directory with the following variables:

**Note:** Copy the example below and create your `.env.local` file manually.

### Basic Configuration

```env
# Set to 'test' for testnet or 'main' for mainnet
NEXT_PUBLIC_NETWORK_SETUP=test
```

### Testnet Configuration

```env
# Testnet Algorand Node
NEXT_PUBLIC_TESTNET_ALGOD_TOKEN=
NEXT_PUBLIC_TESTNET_ALGOD_SERVER=https://testnet-api.algonode.cloud
NEXT_PUBLIC_TESTNET_ALGOD_PORT=443

# Testnet Indexer
NEXT_PUBLIC_TESTNET_INDEXER_TOKEN=
NEXT_PUBLIC_TESTNET_INDEXER_SERVER=https://testnet-idx.algonode.cloud
NEXT_PUBLIC_TESTNET_INDEXER_PORT=443

# Testnet Smart Contracts
NEXT_PUBLIC_TESTNET_VERIFICATION_ESCROW=Q3Z2HNPQXU4WZYW3XXOEOSRBWUCURKBZTGYOEFVREWOX52QIHE7WELNECQ
NEXT_PUBLIC_TESTNET_REWARD_CONTRACT_APP_ID=0
NEXT_PUBLIC_TESTNET_SMART_CONTRACT_APP_ID=745687090
NEXT_PUBLIC_TESTNET_SMART_CONTRACT_ADDRESS=Q3Z2HNPQXU4WZYW3XXOEOSRBWUCURKBZTGYOEFVREWOX52QIHE7WELNECQ

# Testnet Escrow Mnemonic (Keep secure!)
TESTNET_ESCROW_MNEMONIC=guide once swamp raw view hospital unhappy timber trend people useful sausage venue harsh embody sponsor oyster come museum notice interest tribe beach abandon luggage
```

### Mainnet Configuration

```env
# Mainnet Algorand Node
NEXT_PUBLIC_MAINNET_ALGOD_TOKEN=your_mainnet_token_here
NEXT_PUBLIC_MAINNET_ALGOD_SERVER=https://mainnet-api.algonode.cloud
NEXT_PUBLIC_MAINNET_ALGOD_PORT=443

# Mainnet Indexer
NEXT_PUBLIC_MAINNET_INDEXER_TOKEN=your_mainnet_indexer_token_here
NEXT_PUBLIC_MAINNET_INDEXER_SERVER=https://mainnet-idx.algonode.cloud
NEXT_PUBLIC_MAINNET_INDEXER_PORT=443

# Mainnet Smart Contracts (Update with your deployed contracts)
NEXT_PUBLIC_MAINNET_VERIFICATION_ESCROW=your_mainnet_escrow_address
NEXT_PUBLIC_MAINNET_REWARD_CONTRACT_APP_ID=0
NEXT_PUBLIC_MAINNET_SMART_CONTRACT_APP_ID=your_mainnet_app_id
NEXT_PUBLIC_MAINNET_SMART_CONTRACT_ADDRESS=your_mainnet_contract_address

# Mainnet Escrow Mnemonic (Keep secure!)
MAINNET_ESCROW_MNEMONIC=your_mainnet_escrow_mnemonic_here
```

### AI Verification API

```env
# AI Verification API URL
NEXT_PUBLIC_AI_VERIFICATION_API_URL=http://localhost:8000
```

## Usage

### Switching Networks

1. **Update Environment Variable**: Change `NEXT_PUBLIC_NETWORK_SETUP` to either `test` or `main`
2. **Restart Development Server**: Stop and restart your Next.js development server
3. **Refresh Browser**: Refresh your browser to pick up the new configuration

### Example Commands

```bash
# For testnet
echo "NEXT_PUBLIC_NETWORK_SETUP=test" > .env.local

# For mainnet
echo "NEXT_PUBLIC_NETWORK_SETUP=main" > .env.local

# Restart development server
npm run dev
```

## Components

### NetworkStatus Component

Shows the current network status in your UI:

```tsx
import { NetworkStatus } from '@/components/NetworkStatus';

<NetworkStatus className="mb-4" />
```

### NetworkSwitcher Component

Provides a UI to switch between networks:

```tsx
import { NetworkSwitcher } from '@/components/NetworkSwitcher';

<NetworkSwitcher 
  onNetworkChange={(network) => console.log('Switched to:', network)}
  className="max-w-md"
/>
```

## Security Notes

- **Never commit `.env.local`** to version control
- **Keep mnemonic phrases secure** - they provide access to your funds
- **Use different accounts** for testnet and mainnet
- **Test thoroughly** on testnet before deploying to mainnet

## Network Differences

| Feature | Testnet | Mainnet |
|---------|---------|---------|
| ALGO | Free test tokens | Real ALGO |
| Smart Contracts | Test deployments | Production contracts |
| Chain ID | 416002 | 416001 |
| Explorer | testnet.algoexplorer.io | algoexplorer.io |
| Risk | Safe for testing | Real money at risk |

## Troubleshooting

### Common Issues

1. **"Invalid network configuration"**: Check that all required environment variables are set
2. **"Transaction failed"**: Verify you're using the correct network and have sufficient ALGO
3. **"Smart contract not found"**: Ensure the contract is deployed on the current network

### Debug Mode

Enable debug logging by adding to your `.env.local`:

```env
NEXT_PUBLIC_DEBUG=true
```

This will log network configuration and transaction details to the console.
