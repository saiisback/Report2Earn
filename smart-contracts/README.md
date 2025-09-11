# Algorand Reward Smart Contract

This smart contract allows users to claim 2 ALGO rewards by opting into the contract and calling the claim function.

## Features

- Users can opt in to the smart contract
- Each user can claim exactly 2 ALGO once
- Prevents double claiming using local state
- Only the contract creator can update or delete the contract

## Smart Contract Structure

### Approval Program (`approval.teal`)
- Handles opt-in, claim, and administrative functions
- Tracks if a user has already claimed using local state
- Validates that the contract has sufficient funds before allowing claims

### Clear State Program (`clear.teal`)
- Allows users to opt out of the contract
- Clears their local state when they opt out

## Deployment Instructions

1. **Install Dependencies**
   ```bash
   cd smart-contracts
   npm install
   ```

2. **Set Environment Variables**
   Create a `.env` file with your Algorand node credentials:
   ```env
   ALGOD_TOKEN=your_algod_token
   ALGOD_SERVER=https://testnet-api.algonode.cloud
   ALGOD_PORT=443
   ```

3. **Deploy the Contract**
   ```bash
   npm run deploy
   ```

4. **Fund the Contract**
   The deployment script will:
   - Create a test account
   - Ask you to fund it with testnet ALGO
   - Deploy the smart contract
   - Fund the contract with 10 ALGO for testing

5. **Update Frontend Configuration**
   After deployment, update your frontend environment variables:
   ```env
   NEXT_PUBLIC_REWARD_CONTRACT_APP_ID=your_deployed_app_id
   ```

## How It Works

1. **Opt In**: Users first opt into the smart contract by calling the opt-in function
2. **Claim Reward**: Users can then claim 2 ALGO by calling the claim function
3. **One-Time Claim**: The contract tracks if a user has already claimed using local state
4. **Automatic Payment**: The contract automatically sends 2 ALGO to the user's wallet

## Frontend Integration

The frontend includes:
- A reward section on the verify page
- Status indicators showing opt-in and claim status
- Buttons to opt in and claim rewards
- Transaction status and links to AlgoExplorer

## Security Features

- Only the contract creator can update or delete the contract
- Users can only claim once (tracked in local state)
- Contract validates it has sufficient funds before allowing claims
- Users can opt out at any time to clear their local state

## Testing

1. Deploy the contract to Algorand Testnet
2. Connect a wallet to the frontend
3. Click "Opt In to Contract"
4. Click "Claim 2 ALGO"
5. Verify the transaction on AlgoExplorer

## Contract Address

After deployment, the contract will have a unique address that holds the ALGO for rewards. Users don't need to know this address - the frontend handles all interactions automatically.

## Troubleshooting

- **"Contract not funded"**: Make sure the contract has sufficient ALGO
- **"Already claimed"**: Each user can only claim once
- **"Not opted in"**: Users must opt in before claiming
- **Transaction fails**: Check that the user has enough ALGO for transaction fees
