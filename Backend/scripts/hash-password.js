const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node hash-password.js <password>');
  console.log('Example: node hash-password.js mypassword123');
  process.exit(1);
}

bcrypt.genSalt(10, (err, salt) => {
  if (err) {
    console.error('Error generating salt:', err);
    process.exit(1);
  }
  
  bcrypt.hash(password, salt, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      process.exit(1);
    }
    
    console.log('\n✅ Password hashed successfully!\n');
    console.log('Password Hash:');
    console.log(hash);
    console.log('\nAdd this to your FAMILY_USERS environment variable:');
    console.log(`yourusername:${hash}`);
    console.log('\nFor multiple users, separate with commas:');
    console.log(`user1:${hash},user2:anotherhash`);
    console.log('');
  });
});