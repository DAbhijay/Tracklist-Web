
const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('\n📝 Usage: node Backend/scripts/create-user.js <username> <password>\n');
    console.log('Example: node Backend/scripts/create-user.js alice mypassword123\n');
    console.log('This will output a hash that you can add to your FAMILY_USERS env variable.\n');
    return;
  }

  const [username, password] = args;

  console.log('\n🔐 Creating hashed password for user:', username);
  console.log('⏳ Hashing password...\n');

  const hashedPassword = await hashPassword(password);

  console.log('✅ Done!\n');
  console.log('Add this to your FAMILY_USERS environment variable:\n');
  console.log(`   ${username}:${hashedPassword}\n`);
  console.log('If you have multiple users, separate them with commas:\n');
  console.log(`   FAMILY_USERS=alice:$2a$10$...,bob:$2a$10$...\n`);
  console.log('---\n');
  console.log('🚀 Full example for Render environment variable:');
  console.log(`   FAMILY_USERS=${username}:${hashedPassword}\n`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});