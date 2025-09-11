// deploy-manual.js
const algosdk = require('algosdk');
const fs = require('fs');

// Algorand client
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', 443);

async function deploy() {
  try {
    // Read TEAL files
    const approvalProgram = fs.readFileSync('approval.teal', 'utf8');
    const clearProgram = fs.readFileSync('clear.teal', 'utf8');
    
    // Compile programs
    const compiledApproval = await algodClient.compile(approvalProgram).do();
    const compiledClear = await algodClient.compile(clearProgram).do();
    
    console.log('Compiled successfully!');
    console.log('Approval Program ID:', compiledApproval.hash);
    console.log('Clear Program ID:', compiledClear.hash);
    
    // Create account
    const creator = algosdk.generateAccount();

    const address = algosdk.encodeAddress(creator.addr.publicKey);
    const mnemonic = algosdk.secretKeyToMnemonic(creator.sk);
    
    console.log('Creator Address:', address);
    console.log('Creator Mnemonic:', mnemonic);
    
    console.log('\nFund this address with testnet ALGO:');
    console.log('https://testnet.algoexplorer.io/dispenser');
    console.log('Address:', address);
    
    // Save the details for later use
    const accountDetails = {
      address: address,
      mnemonic: mnemonic
    };
    
    fs.writeFileSync('account-details.json', JSON.stringify(accountDetails, null, 2));
    console.log('\nAccount details saved to account-details.json');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

deploy();