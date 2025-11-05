
const { pool } = require('./server/db');
const bcrypt = require('bcryptjs');

async function resetAndTestAdmin() {
  try {
    console.log('🔄 Starting admin user reset and testing...\n');
    
    // Step 1: Delete existing admin user
    console.log('Step 1: Deleting existing admin user...');
    const deleteResult = await pool.query(
      "DELETE FROM users WHERE username = 'admin'"
    );
    
    if (deleteResult.rowCount > 0) {
      console.log('✅ Existing admin user deleted\n');
    } else {
      console.log('ℹ️  No existing admin user found\n');
    }
    
    // Step 2: Create new admin user with fresh credentials
    console.log('Step 2: Creating new admin user...');
    const newPassword = 'Admin2025!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const createResult = await pool.query(
      `INSERT INTO users (username, password, email, "firstName", "lastName", role, "createdAt") 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING id, username, email, "firstName", "lastName", role`,
      ['admin', hashedPassword, 'admin@college.edu', 'Admin', 'User', 'admin']
    );
    
    if (createResult.rows.length === 0) {
      throw new Error('Failed to create admin user');
    }
    
    const newUser = createResult.rows[0];
    console.log('✅ New admin user created successfully');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role}\n`);
    
    // Step 3: Verify the user exists in database
    console.log('Step 3: Verifying user exists in database...');
    const verifyUser = await pool.query(
      "SELECT id, username, email, role FROM users WHERE username = 'admin'"
    );
    
    if (verifyUser.rows.length === 0) {
      throw new Error('Admin user not found after creation');
    }
    console.log('✅ User exists in database\n');
    
    // Step 4: Test password hash retrieval
    console.log('Step 4: Testing password hash retrieval...');
    const passwordCheck = await pool.query(
      "SELECT password FROM users WHERE username = 'admin'"
    );
    
    if (!passwordCheck.rows[0].password) {
      throw new Error('Password hash not stored');
    }
    console.log('✅ Password hash stored correctly\n');
    
    // Step 5: Test password verification
    console.log('Step 5: Testing password verification...');
    const storedHash = passwordCheck.rows[0].password;
    const isValid = await bcrypt.compare(newPassword, storedHash);
    
    if (!isValid) {
      throw new Error('Password verification failed');
    }
    console.log('✅ Password verification successful\n');
    
    // Step 6: Test incorrect password
    console.log('Step 6: Testing incorrect password rejection...');
    const incorrectTest = await bcrypt.compare('WrongPassword123!', storedHash);
    
    if (incorrectTest) {
      throw new Error('Incorrect password was accepted');
    }
    console.log('✅ Incorrect password correctly rejected\n');
    
    // Step 7: Final verification
    console.log('Step 7: Final comprehensive check...');
    const finalCheck = await pool.query(
      `SELECT id, username, password, email, "firstName", "lastName", role 
       FROM users WHERE username = 'admin'`
    );
    
    if (finalCheck.rows.length === 0) {
      throw new Error('Final check failed - user not found');
    }
    
    const user = finalCheck.rows[0];
    const finalPasswordTest = await bcrypt.compare(newPassword, user.password);
    
    if (!finalPasswordTest) {
      throw new Error('Final password test failed');
    }
    
    console.log('✅ All tests passed!\n');
    console.log('═══════════════════════════════════════════');
    console.log('📋 ADMIN LOGIN CREDENTIALS (VERIFIED):');
    console.log('═══════════════════════════════════════════');
    console.log('   Username: admin');
    console.log('   Password: Admin2025!');
    console.log('   Email: admin@college.edu');
    console.log('═══════════════════════════════════════════\n');
    console.log('✅ Admin account is ready to use!');
    console.log('🔒 Password has been verified to work correctly');
    console.log('💡 You can now log in to the application\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during admin reset:', error.message);
    console.error('Stack trace:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

resetAndTestAdmin();
