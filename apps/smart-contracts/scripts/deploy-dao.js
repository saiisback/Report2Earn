const algosdk = require('algosdk');
const fs = require('fs');
const path = require('path');

// Get network configuration from environment or use defaults
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || '';
const ALGOD_SERVER = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = process.env.ALGOD_PORT || 443;

const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

async function deployDAO() {
  try {
    // Read account details from file
    const accountDetailsPath = path.join(__dirname, '../contracts/account-details.json');
    const accountDetails = JSON.parse(fs.readFileSync(accountDetailsPath, 'utf8'));
    const creator = algosdk.mnemonicToSecretKey(accountDetails.mnemonic);
    
    const creatorAddress = accountDetails.address;
    console.log('DAO Creator Address:', creatorAddress);
    
    // Check if account has sufficient balance
    const accountInfo = await algodClient.accountInformation(creatorAddress).do();
    const balance = Number(accountInfo.amount) / 1000000;
    console.log('Account Balance:', balance, 'ALGO');
    
    if (Number(accountInfo.amount) < 2000000) { // Less than 2 ALGO
      console.log('⚠️  Warning: Low balance. Please fund your account with testnet ALGO:');
      console.log('https://testnet.algoexplorer.io/dispenser');
      console.log('Address:', creatorAddress);
      return;
    }
    
    // Read TEAL files
    const approvalProgramPath = path.join(__dirname, '../contracts/dao-approval.teal');
    const clearProgramPath = path.join(__dirname, '../contracts/dao-clear.teal');
    
    const approvalProgram = fs.readFileSync(approvalProgramPath, 'utf8');
    const clearProgram = fs.readFileSync(clearProgramPath, 'utf8');
    
    // Compile programs
    console.log('Compiling DAO contract programs...');
    const compiledApproval = await algodClient.compile(approvalProgram).do();
    const compiledClear = await algodClient.compile(clearProgram).do();
    
    console.log('✅ Compiled successfully!');
    console.log('Approval Program ID:', compiledApproval.hash);
    console.log('Clear Program ID:', compiledClear.hash);
    
    // Get suggested parameters
    const params = await algodClient.getTransactionParams().do();
    
    // DAO Contract Schema:
    // Global State:
    // - proposal_count (uint64)
    // - voting_period (uint64) - default: 10000 rounds (~7 days)
    // - quorum_threshold (uint64) - default: 5000 (50% in basis points)
    // - min_proposal_deposit (uint64) - default: 10 ALGO
    
    // Local State (per user):
    // - has_voted_{proposal_id} (uint64)
    // - vote_choice_{proposal_id} (uint64)
    
    const appArgs = [];
    const localInts = 0;  // Dynamic local state per proposal
    const localBytes = 0;
    const globalInts = 4; // proposal_count, voting_period, quorum_threshold, min_proposal_deposit
    const globalBytes = 0; // Proposal data stored dynamically
    
    try {
      const suggestedParams = params;
      
      const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
        sender: creatorAddress,
        suggestedParams: suggestedParams,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram: new Uint8Array(Buffer.from(compiledApproval.result, 'base64')),
        clearProgram: new Uint8Array(Buffer.from(compiledClear.result, 'base64')),
        numLocalInts: localInts,
        numLocalByteSlices: localBytes,
        numGlobalInts: globalInts,
        numGlobalByteSlices: globalBytes,
        appArgs: appArgs
      });
      
      console.log('Transaction created successfully');
      
      // Sign and send transaction
      const signedTxn = appCreateTxn.signTxn(creator.sk);
      const txId = appCreateTxn.txID().toString();
      
      console.log('\n🚀 Deploying DAO governance contract...');
      console.log('Transaction ID:', txId);
      
      const result = await algodClient.sendRawTransaction(signedTxn).do();
      console.log('Transaction sent:', result.txId);
      
      // Wait for confirmation
      console.log('Waiting for confirmation...');
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      const appId = confirmedTxn['applicationIndex'];
      console.log('\n✅ DAO governance contract deployed successfully!');
      console.log('DAO App ID:', appId);
      console.log('Transaction confirmed in round:', confirmedTxn['confirmedRound']);
      
      // Initialize default DAO parameters
      console.log('\n📝 Initializing DAO parameters...');
      
      const initParams = await algodClient.getTransactionParams().do();
      
      // Set default values:
      // - voting_period: 10000 rounds (~7 days)
      // - quorum_threshold: 5000 (50%)
      // - min_proposal_deposit: 10 ALGO (10000000 microAlgos)
      
      const initTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: creatorAddress,
        suggestedParams: initParams,
        appIndex: Number(appId),
        appArgs: [
          new Uint8Array(Buffer.from('init_dao')),
          algosdk.encodeUint64(10000),  // voting_period
          algosdk.encodeUint64(5000),   // quorum_threshold (50%)
          algosdk.encodeUint64(10000000) // min_proposal_deposit (10 ALGO)
        ]
      });
      
      const signedInitTxn = initTxn.signTxn(creator.sk);
      const initTxId = initTxn.txID().toString();
      await algodClient.sendRawTransaction(signedInitTxn).do();
      await algosdk.waitForConfirmation(algodClient, initTxId, 4);
      
      console.log('✅ DAO parameters initialized');
      
      // Update account details with DAO App ID
      if (appId) {
        accountDetails.daoAppId = Number(appId);
        fs.writeFileSync(accountDetailsPath, JSON.stringify(accountDetails, null, 2));
        console.log('\n✅ DAO App ID saved to account-details.json');
      }
      
      console.log('\n📋 DAO Contract Summary:');
      console.log('   App ID:', appId);
      console.log('   Voting Period: 10000 rounds (~7 days)');
      console.log('   Quorum Threshold: 50%');
      console.log('   Min Proposal Deposit: 10 ALGO');
      console.log('\n💡 Next steps:');
      console.log('   1. Users can opt-in to participate in governance');
      console.log('   2. Create proposals with minimum 10 ALGO deposit');
      console.log('   3. Vote on active proposals');
      console.log('   4. Execute passed proposals after voting period ends');
      
    } catch (createError) {
      console.error('❌ Error creating transaction:', createError.message);
      console.error('Full error:', createError);
      throw createError;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
  }
}

deployDAO();

