const algosdk = require('algosdk');
const fs = require('fs');
const path = require('path');

const CONTRACTS_DIR = path.resolve(__dirname, '../contracts');
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', 443);

async function deploy() {
  try {
    // Read account details from file
    const accountDetailsPath = path.join(CONTRACTS_DIR, 'account-details.json');
    const accountDetails = JSON.parse(fs.readFileSync(accountDetailsPath, 'utf8'));
    const creator = algosdk.mnemonicToSecretKey(accountDetails.mnemonic);
    
    // Use the address directly from account details
    const creatorAddress = accountDetails.address;
    console.log('Creator Address:', creatorAddress);
    
    // Check if account has sufficient balance
    const accountInfo = await algodClient.accountInformation(creatorAddress).do();
    const balance = Number(accountInfo.amount) / 1000000;
    console.log('Account Balance:', balance, 'ALGO');
    
    if (Number(accountInfo.amount) < 1000000) { // Less than 1 ALGO
      console.log('⚠️  Warning: Low balance. Please fund your account with testnet ALGO:');
      console.log('https://testnet.algoexplorer.io/dispenser');
      console.log('Address:', creatorAddress);
      return;
    }
    
    // Read TEAL files
    const approvalProgram = fs.readFileSync(path.join(CONTRACTS_DIR, 'approval.teal'), 'utf8');
    const clearProgram = fs.readFileSync(path.join(CONTRACTS_DIR, 'clear.teal'), 'utf8');
    
    // Compile programs
    const compiledApproval = await algodClient.compile(approvalProgram).do();
    const compiledClear = await algodClient.compile(clearProgram).do();
    
    console.log('Compiled successfully!');
    console.log('Approval Program ID:', compiledApproval.hash);
    console.log('Clear Program ID:', compiledClear.hash);
    
    // Get suggested parameters
    const params = await algodClient.getTransactionParams().do();
    
    // Create application creation transaction
    const appArgs = [];
    const localInts = 0;
    const localBytes = 1; // For "claimed" status
    const globalInts = 0;
    const globalBytes = 0;
    
    try {
      // Use raw params directly
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
      
      console.log('\nDeploying smart contract...');
      console.log('Transaction ID:', txId);
      
      const result = await algodClient.sendRawTransaction(signedTxn).do();
      console.log('Transaction sent:', result.txId);
      
      // Wait for confirmation
      console.log('Waiting for confirmation...');
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      const appId = confirmedTxn['applicationIndex'];
      console.log('\n✅ Smart contract deployed successfully!');
      console.log('App ID:', appId);
      console.log('Transaction confirmed in round:', confirmedTxn['confirmedRound']);
      
      // Update account details with App ID
      if (appId) {
        accountDetails.appId = Number(appId);
        fs.writeFileSync(accountDetailsPath, JSON.stringify(accountDetails, null, 2));
        console.log('\nApp ID saved to account-details.json');
      } else {
        console.log('\n⚠️  Warning: App ID not found in confirmed transaction');
        console.log('Confirmed transaction keys:', Object.keys(confirmedTxn));
        console.log('Application index:', confirmedTxn['applicationIndex']);
        console.log('Transaction type:', confirmedTxn['txn'] ? confirmedTxn['txn']['tx-type'] : 'unknown');
      }
      
    } catch (createError) {
      console.error('Error creating transaction:', createError.message);
      console.error('Full error:', createError);
      throw createError;
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
  }
}

deploy();
