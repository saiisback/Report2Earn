# DAO Governance Contract

The Report2Earn DAO (Decentralized Autonomous Organization) enables community-driven governance through proposals and voting mechanisms.

## Overview

The DAO contract allows token holders and community members to:
- Create governance proposals
- Vote on proposals
- Execute passed proposals
- Track proposal status and voting results

## Contract Architecture

### Global State

- `proposal_count` (uint64): Total number of proposals created
- `voting_period` (uint64): Default voting period in rounds (~7 days = 10000 rounds)
- `quorum_threshold` (uint64): Minimum votes required (in basis points, 5000 = 50%)
- `min_proposal_deposit` (uint64): Minimum ALGO required to create a proposal (default: 10 ALGO)

### Proposal Structure

Each proposal stores:
- `proposal_{id}_creator`: Address of proposal creator
- `proposal_{id}_start_round`: Round when voting starts
- `proposal_{id}_end_round`: Round when voting ends
- `proposal_{id}_yes_votes`: Count of yes votes
- `proposal_{id}_no_votes`: Count of no votes
- `proposal_{id}_abstain_votes`: Count of abstain votes
- `proposal_{id}_status`: 0 = Active, 1 = Passed, 2 = Rejected, 3 = Executed
- `proposal_{id}_description`: Proposal description hash

### Local State (Per User)

- `has_voted_{proposal_id}`: 1 if user voted, 0 otherwise
- `vote_choice_{proposal_id}`: 1 = Yes, 2 = No, 3 = Abstain

## Deployment

```bash
cd apps/smart-contracts
npm install
npm run deploy:dao
```

This will:
1. Deploy the DAO contract
2. Initialize default parameters:
   - Voting period: 10000 rounds (~7 days)
   - Quorum threshold: 50%
   - Min proposal deposit: 10 ALGO

## Usage

### 1. Opt-In to DAO

Users must opt-in to participate in governance:

```javascript
const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
  sender: userAddress,
  suggestedParams: params,
  appIndex: daoAppId,
});
```

### 2. Create a Proposal

```javascript
const daoClient = new DAOClient(algodClient, daoAppId, userAccount);

await daoClient.createProposal(
  'Increase reward pool by 50%',  // Description
  10000,                            // Voting period (rounds)
  10                                // Deposit (ALGO)
);
```

**Requirements:**
- Minimum deposit: 10 ALGO (configurable)
- Proposal must include description
- Voting period must be specified

### 3. Vote on a Proposal

```javascript
// Vote Yes (1), No (2), or Abstain (3)
await daoClient.vote(proposalId, 1); // Yes
```

**Rules:**
- Users can only vote once per proposal
- Voting is only allowed during active voting period
- Votes are recorded on-chain

### 4. Execute a Proposal

After voting period ends and proposal passes:

```javascript
await daoClient.executeProposal(proposalId);
```

**Requirements:**
- Voting period must have ended
- Proposal must have passed (Yes votes > No votes)
- Quorum threshold must be met

### 5. Query Proposal Status

```javascript
// Get single proposal
const proposal = await daoClient.getProposal(proposalId);

// Get all proposals
const proposals = await daoClient.getAllProposals();
```

## Proposal Lifecycle

1. **Creation**: User creates proposal with deposit
2. **Active**: Voting period is open
3. **Voting**: Community members vote
4. **Ended**: Voting period closes
5. **Execution**: If passed, proposal can be executed
6. **Executed**: Proposal has been executed

## Governance Parameters

### Default Values

- **Voting Period**: 10000 rounds (~7 days at ~0.6 seconds per round)
- **Quorum Threshold**: 50% (5000 basis points)
- **Min Proposal Deposit**: 10 ALGO

### Customization

These parameters can be adjusted by governance proposals or contract updates.

## Security Considerations

1. **Proposal Spam Prevention**: Minimum deposit required
2. **Double Voting Prevention**: On-chain vote tracking
3. **Time-based Voting**: Fixed voting periods prevent manipulation
4. **Quorum Requirements**: Ensures meaningful participation

## Example Use Cases

1. **Reward Pool Management**: Propose changes to reward distribution
2. **Feature Proposals**: Vote on new platform features
3. **Parameter Updates**: Adjust governance or contract parameters
4. **Treasury Management**: Propose fund allocation
5. **Community Initiatives**: Propose community-driven projects

## Integration

The DAO can be integrated with:

- Frontend voting interfaces
- Notification systems for new proposals
- Analytics dashboards for governance metrics
- Automated proposal execution systems

## Future Enhancements

Potential improvements:
- Token-weighted voting
- Delegation mechanisms
- Multi-signature execution
- Proposal templates
- Voting power calculations
- Snapshot integration

## Support

For questions or issues:
- Check [Smart Contracts README](../README.md)
- Open an issue on GitHub
- Review contract code in `contracts/dao-approval.teal`

