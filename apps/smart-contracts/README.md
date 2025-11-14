# R2E Smart Contracts

Reusable Algorand TEAL programs and deployment scripts that power the Report2Earn platform, including reward distribution and DAO governance.

## Contracts

### 1. Reward Contract (`approval.teal`)
Handles verification fees and dynamic reward distribution for content verification.

### 2. DAO Governance Contract (`dao-approval.teal`)
Enables decentralized community governance through proposals and voting.

## Quick Start

```bash
cd apps/smart-contracts
npm install

# Deploy reward contract
npm run deploy

# Deploy DAO governance contract
npm run deploy:dao

# Create creator account (optional)
npm run deploy:creator
```

## Contract Details

### Reward Contract

- **Purpose**: Manages verification fees and reward distribution
- **Features**: User opt-in, one-time claims, automatic distribution
- **Deployment**: `npm run deploy`

### DAO Governance Contract

- **Purpose**: Community-driven decision making
- **Features**: 
  - Proposal creation with deposits
  - Voting mechanism (Yes/No/Abstain)
  - Quorum-based execution
  - Time-based voting periods
- **Deployment**: `npm run deploy:dao`
- **Documentation**: See [DAO.md](docs/DAO.md)

## Usage Examples

### Reward Contract

```javascript
// Opt-in to reward contract
const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
  sender: userAddress,
  suggestedParams: params,
  appIndex: rewardAppId,
});

// Claim reward
const claimTxn = algosdk.makeApplicationNoOpTxnFromObject({
  sender: userAddress,
  suggestedParams: params,
  appIndex: rewardAppId,
});
```

### DAO Governance

```javascript
const DAOClient = require('./scripts/dao-interactions');
const daoClient = new DAOClient(algodClient, daoAppId, userAccount);

// Create proposal
await daoClient.createProposal('Increase reward pool', 10000, 10);

// Vote
await daoClient.vote(proposalId, 1); // 1=Yes, 2=No, 3=Abstain

// Execute passed proposal
await daoClient.executeProposal(proposalId);

// Query proposals
const proposals = await daoClient.getAllProposals();
```

See [DAO.md](docs/DAO.md) for detailed DAO documentation.

## File Structure

```
smart-contracts/
├── contracts/
│   ├── approval.teal          # Reward contract
│   ├── clear.teal             # Reward clear state
│   ├── dao-approval.teal      # DAO governance contract
│   ├── dao-clear.teal         # DAO clear state
│   └── account-details.json    # Deployment metadata
├── scripts/
│   ├── deploy-contract.js      # Deploy reward contract
│   ├── deploy-dao.js          # Deploy DAO contract
│   ├── deploy-creator.js      # Create creator account
│   └── dao-interactions.js    # DAO interaction utilities
└── docs/
    └── DAO.md                  # DAO documentation
```

## Environment Variables

```env
ALGOD_TOKEN=your_algod_token
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_PORT=443
```

## Testing

Contracts should be tested on Algorand Testnet before mainnet deployment:

1. Deploy to testnet
2. Test all contract functions
3. Verify state changes
4. Test edge cases
5. Security audit (recommended)

## Security Considerations

- Always audit contracts before mainnet deployment
- Test thoroughly on testnet
- Use multi-signature wallets for contract management
- Keep private keys secure
- Review all contract interactions

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) file for details.
