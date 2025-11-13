const algosdk = require('algosdk');

// Generate a new Algorand account
const account = algosdk.generateAccount();

console.log('=== ESCROW ACCOUNT GENERATED ===');
console.log('Address:', account.addr);
console.log('Mnemonic:', algosdk.secretKeyToMnemonic(account.sk));
console.log('================================');
console.log('');
console.log('IMPORTANT:');
console.log('1. Save this mnemonic phrase securely');
console.log('2. Fund this account with ALGO (at least 10-20 ALGO for testing)');
console.log('3. Add these to your .env.local file:');
console.log('');
console.log('NEXT_PUBLIC_VERIFICATION_ESCROW=' + account.addr);
console.log('ESCROW_MNEMONIC=' + algosdk.secretKeyToMnemonic(account.sk));
