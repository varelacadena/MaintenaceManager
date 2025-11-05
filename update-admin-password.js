
const { pool } = require('./server/db');
const bcrypt = require('bcryptjs');

async function updateAdminPassword() {
  try {
    // Set the new password
    const newPassword = 'Admin2025!';
    
    // Generate a fresh bcrypt hash
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('🔄 Updating admin password...');
    
    // Update the password in the database
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE username = 'admin' RETURNING id, username",
      [hashedPassword]
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('📋 Login Credentials:');
      console.log('   Username: admin');
      console.log('   Password: Admin2025!');
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
      console.log('❌ Admin user not found in database');
      console.log('💡 Try running: npm run dev to seed the database first');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating password:', error);
    await pool.end();
    process.exit(1);
  }
}

updateAdminPassword();
