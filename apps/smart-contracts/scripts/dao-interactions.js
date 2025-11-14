const algosdk = require('algosdk');
const fs = require('fs');
const path = require('path');

// DAO interaction utilities for Report2Earn governance

class DAOClient {
  constructor(algodClient, appId, creatorAccount) {
    this.algodClient = algodClient;
    this.appId = appId;
    this.creatorAccount = creatorAccount;
  }

  /**
   * Create a new governance proposal
   * @param {string} description - Proposal description (will be hashed)
   * @param {number} votingPeriodRounds - Voting period in rounds (default: 10000)
   * @param {number} depositAmount - ALGO deposit amount (default: 10 ALGO)
   * @returns {Promise<string>} Transaction ID
   */
  async createProposal(description, votingPeriodRounds = 10000, depositAmount = 10) {
    try {
      const params = await this.algodClient.getTransactionParams().do();
      
      // Hash description (in production, use proper hashing)
      const descriptionHash = Buffer.from(description).toString('base64');
      
      // Create payment transaction for deposit
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.creatorAccount.addr,
        to: algosdk.getApplicationAddress(this.appId),
        amount: algosdk.algosToMicroalgos(depositAmount),
        suggestedParams: params,
      });
      
      // Create app call transaction
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: this.creatorAccount.addr,
        suggestedParams: params,
        appIndex: this.appId,
        appArgs: [
          new Uint8Array(Buffer.from('create_proposal')),
          new Uint8Array(Buffer.from(descriptionHash)),
          algosdk.encodeUint64(votingPeriodRounds),
        ],
      });
      
      // Group transactions
      algosdk.assignGroupID([paymentTxn, appCallTxn]);
      
      // Sign transactions
      const signedPayment = paymentTxn.signTxn(this.creatorAccount.sk);
      const signedAppCall = appCallTxn.signTxn(this.creatorAccount.sk);
      
      // Send transactions
      const txId = await this.algodClient.sendRawTransaction([
        signedPayment,
        signedAppCall,
      ]).do();
      
      await algosdk.waitForConfirmation(this.algodClient, txId, 4);
      
      console.log('✅ Proposal created successfully!');
      console.log('Transaction ID:', txId);
      
      return txId;
    } catch (error) {
      console.error('❌ Error creating proposal:', error);
      throw error;
    }
  }

  /**
   * Vote on an active proposal
   * @param {number} proposalId - Proposal ID
   * @param {number} voteChoice - 1 = Yes, 2 = No, 3 = Abstain
   * @returns {Promise<string>} Transaction ID
   */
  async vote(proposalId, voteChoice) {
    try {
      if (![1, 2, 3].includes(voteChoice)) {
        throw new Error('Invalid vote choice. Use 1 (Yes), 2 (No), or 3 (Abstain)');
      }
      
      const params = await this.algodClient.getTransactionParams().do();
      
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: this.creatorAccount.addr,
        suggestedParams: params,
        appIndex: this.appId,
        appArgs: [
          new Uint8Array(Buffer.from('vote')),
          algosdk.encodeUint64(proposalId),
          algosdk.encodeUint64(voteChoice),
        ],
      });
      
      const signedTxn = appCallTxn.signTxn(this.creatorAccount.sk);
      const txId = await this.algodClient.sendRawTransaction(signedTxn).do();
      
      await algosdk.waitForConfirmation(this.algodClient, txId, 4);
      
      const voteNames = { 1: 'Yes', 2: 'No', 3: 'Abstain' };
      console.log(`✅ Voted ${voteNames[voteChoice]} on proposal ${proposalId}`);
      console.log('Transaction ID:', txId);
      
      return txId;
    } catch (error) {
      console.error('❌ Error voting:', error);
      throw error;
    }
  }

  /**
   * Execute a passed proposal
   * @param {number} proposalId - Proposal ID
   * @returns {Promise<string>} Transaction ID
   */
  async executeProposal(proposalId) {
    try {
      const params = await this.algodClient.getTransactionParams().do();
      
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: this.creatorAccount.addr,
        suggestedParams: params,
        appIndex: this.appId,
        appArgs: [
          new Uint8Array(Buffer.from('execute_proposal')),
          algosdk.encodeUint64(proposalId),
        ],
      });
      
      const signedTxn = appCallTxn.signTxn(this.creatorAccount.sk);
      const txId = await this.algodClient.sendRawTransaction(signedTxn).do();
      
      await algosdk.waitForConfirmation(this.algodClient, txId, 4);
      
      console.log(`✅ Proposal ${proposalId} executed successfully!`);
      console.log('Transaction ID:', txId);
      
      return txId;
    } catch (error) {
      console.error('❌ Error executing proposal:', error);
      throw error;
    }
  }

  /**
   * Get proposal details from global state
   * @param {number} proposalId - Proposal ID
   * @returns {Promise<Object>} Proposal details
   */
  async getProposal(proposalId) {
    try {
      const appInfo = await this.algodClient.getApplicationByID(this.appId).do();
      const globalState = appInfo.params['global-state'] || [];
      
      const getStateValue = (key) => {
        const state = globalState.find(s => {
          const stateKey = Buffer.from(s.key, 'base64').toString();
          return stateKey.includes(key);
        });
        if (!state) return null;
        
        if (state.value.type === 1) {
          // bytes
          return Buffer.from(state.value.bytes, 'base64').toString();
        } else {
          // uint64
          return state.value.uint;
        }
      };
      
      const proposal = {
        id: proposalId,
        creator: getStateValue(`proposal_${proposalId}_creator`),
        startRound: getStateValue(`proposal_${proposalId}_start_round`),
        endRound: getStateValue(`proposal_${proposalId}_end_round`),
        yesVotes: getStateValue(`proposal_${proposalId}_yes_votes`) || 0,
        noVotes: getStateValue(`proposal_${proposalId}_no_votes`) || 0,
        abstainVotes: getStateValue(`proposal_${proposalId}_abstain_votes`) || 0,
        status: getStateValue(`proposal_${proposalId}_status`),
        description: getStateValue(`proposal_${proposalId}_description`),
      };
      
      return proposal;
    } catch (error) {
      console.error('❌ Error getting proposal:', error);
      throw error;
    }
  }

  /**
   * Get all proposals
   * @returns {Promise<Array>} Array of all proposals
   */
  async getAllProposals() {
    try {
      const appInfo = await this.algodClient.getApplicationByID(this.appId).do();
      const globalState = appInfo.params['global-state'] || [];
      
      // Get proposal count
      const proposalCountState = globalState.find(s => {
        const key = Buffer.from(s.key, 'base64').toString();
        return key === 'proposal_count';
      });
      
      const proposalCount = proposalCountState ? proposalCountState.value.uint : 0;
      
      const proposals = [];
      for (let i = 1; i <= proposalCount; i++) {
        try {
          const proposal = await this.getProposal(i);
          if (proposal.creator) {
            proposals.push(proposal);
          }
        } catch (e) {
          // Skip invalid proposals
        }
      }
      
      return proposals;
    } catch (error) {
      console.error('❌ Error getting all proposals:', error);
      throw error;
    }
  }
}

// Example usage
async function example() {
  const ALGOD_TOKEN = process.env.ALGOD_TOKEN || '';
  const ALGOD_SERVER = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
  const ALGOD_PORT = process.env.ALGOD_PORT || 443;
  
  const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
  
  // Load account
  const accountDetailsPath = path.join(__dirname, '../contracts/account-details.json');
  const accountDetails = JSON.parse(fs.readFileSync(accountDetailsPath, 'utf8'));
  const creator = algosdk.mnemonicToSecretKey(accountDetails.mnemonic);
  
  if (!accountDetails.daoAppId) {
    console.error('❌ DAO App ID not found. Please deploy the DAO contract first.');
    return;
  }
  
  const daoClient = new DAOClient(algodClient, accountDetails.daoAppId, creator);
  
  // Example: Create a proposal
  // await daoClient.createProposal('Increase reward pool by 50%', 10000, 10);
  
  // Example: Vote on proposal 1
  // await daoClient.vote(1, 1); // Vote Yes
  
  // Example: Get proposal details
  // const proposal = await daoClient.getProposal(1);
  // console.log('Proposal:', proposal);
  
  // Example: Get all proposals
  // const proposals = await daoClient.getAllProposals();
  // console.log('All proposals:', proposals);
}

if (require.main === module) {
  example().catch(console.error);
}

module.exports = DAOClient;

