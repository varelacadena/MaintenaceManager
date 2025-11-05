
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const ws = require('ws');

// Configure WebSocket for Neon
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

async function resetAdminCredentials() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting complete admin credential reset...\n');

    // Step 1: Delete ALL existing admin users (in case there are duplicates)
    console.log('Step 1: Removing all existing admin users...');
    const deleteResult = await pool.query(
      `DELETE FROM users WHERE username = 'admin' OR role = 'admin'`
    );
    console.log(`✅ Removed ${deleteResult.rowCount} admin user(s)\n`);

    // Step 2: Create fresh password hash
    console.log('Step 2: Creating new password hash...');
    const password = 'Admin2025!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('✅ Password hash created\n');

    // Step 3: Insert new admin user with explicit ID
    console.log('Step 3: Creating new admin user...');
    const insertResult = await pool.query(
      `INSERT INTO users (
        username, 
        password, 
        email, 
        "firstName", 
        "lastName", 
        role,
        "phoneNumber",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, username, email, role`,
      [
        'admin',
        hashedPassword,
        'admin@college.edu',
        'Admin',
        'User',
        'admin',
        null
      ]
    );

    if (insertResult.rows.length === 0) {
      throw new Error('Failed to insert admin user');
    }

    const newAdmin = insertResult.rows[0];
    console.log('✅ Admin user created successfully');
    console.log(`   ID: ${newAdmin.id}`);
    console.log(`   Username: ${newAdmin.username}\n`);

    // Step 4: Verify the user was created
    console.log('Step 4: Verifying user in database...');
    const verifyResult = await pool.query(
      `SELECT id, username, password, email, role FROM users WHERE username = 'admin'`
    );

    if (verifyResult.rows.length === 0) {
      throw new Error('Admin user not found after creation!');
    }

    console.log('✅ User found in database\n');

    // Step 5: Test password hash directly
    console.log('Step 5: Testing password verification...');
    const storedUser = verifyResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, storedUser.password);

    if (!passwordMatch) {
      console.log('❌ Password verification FAILED');
      console.log('Stored hash:', storedUser.password);
      console.log('Test password:', password);
      throw new Error('Password hash verification failed!');
    }

    console.log('✅ Password verification SUCCESSFUL\n');

    // Step 6: Test with wrong password
    console.log('Step 6: Testing rejection of wrong password...');
    const wrongPasswordMatch = await bcrypt.compare('WrongPassword123', storedUser.password);
    
    if (wrongPasswordMatch) {
      throw new Error('Wrong password was accepted - security issue!');
    }

    console.log('✅ Wrong password correctly rejected\n');

    // Step 7: Display final results
    console.log('═══════════════════════════════════════════');
    console.log('✅ ADMIN CREDENTIALS RESET SUCCESSFUL');
    console.log('═══════════════════════════════════════════');
    console.log('Username: admin');
    console.log('Password: Admin2025!');
    console.log('Email: admin@college.edu');
    console.log('═══════════════════════════════════════════\n');
    console.log('🔒 Password has been verified and is working');
    console.log('💡 You can now log in to the application\n');

    // Step 8: Show the hash for debugging
    console.log('Debug Information:');
    console.log('User ID:', storedUser.id);
    console.log('Password Hash (first 20 chars):', storedUser.password.substring(0, 20) + '...');
    console.log('');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack trace:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

resetAdminCredentials();
