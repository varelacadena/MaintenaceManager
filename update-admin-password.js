
const { pool } = require('./server/db');
const bcrypt = require('bcryptjs');

async function updateAdminPassword() {
  try {
    const newPassword = 'AdminSecure2025!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE username = 'admin'",
      [hashedPassword]
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('Username: admin');
      console.log('Password: AdminSecure2025!');
    } else {
      console.log('❌ Admin user not found in database');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }
}

updateAdminPassword();
