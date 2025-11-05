
const { pool } = require('./server/db');
const bcrypt = require('bcryptjs');

async function resetAdminUser() {
  try {
    console.log('🔄 Resetting admin user...');
    
    // Delete existing admin user
    const deleteResult = await pool.query(
      "DELETE FROM users WHERE username = 'admin'"
    );
    
    if (deleteResult.rowCount > 0) {
      console.log('✅ Existing admin user deleted');
    } else {
      console.log('ℹ️  No existing admin user found');
    }
    
    // Create new admin user
    const newPassword = 'Admin2025!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const createResult = await pool.query(
      `INSERT INTO users (username, password, email, "firstName", "lastName", role, "createdAt") 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING id, username, email, "firstName", "lastName", role`,
      ['admin', hashedPassword, 'admin@college.edu', 'Admin', 'User', 'admin']
    );
    
    if (createResult.rows.length > 0) {
      console.log('✅ New admin user created successfully!');
      console.log('');
      console.log('📋 New Admin Credentials:');
      console.log('   Username: admin');
      console.log('   Password: Admin2025!');
      console.log('   Email: admin@college.edu');
      console.log('');
      
      // Verify the password works
      const user = await pool.query(
        "SELECT password FROM users WHERE username = 'admin'"
      );
      
      if (user.rows.length > 0) {
        const isValid = await bcrypt.compare(newPassword, user.rows[0].password);
        if (isValid) {
          console.log('✅ Password verification successful - you can now login!');
        } else {
          console.log('❌ Password verification failed - something went wrong');
        }
      }
    } else {
      console.log('❌ Failed to create new admin user');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin user:', error);
    await pool.end();
    process.exit(1);
  }
}

resetAdminUser();
