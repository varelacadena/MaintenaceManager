
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function verifySantiago() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('='.repeat(50));
    console.log('VERIFYING SANTIAGO USER');
    console.log('='.repeat(50));
    console.log();

    // Check if Santiago exists
    console.log('Checking for Santiago user...');
    const checkResult = await pool.query(
      `SELECT id, username, email, role FROM users WHERE username = 'Santiago'`
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ Santiago user found:');
      console.log(`   ID: ${checkResult.rows[0].id}`);
      console.log(`   Username: ${checkResult.rows[0].username}`);
      console.log(`   Email: ${checkResult.rows[0].email}`);
      console.log(`   Role: ${checkResult.rows[0].role}`);
      console.log();
      
      // Update password to be sure
      const newPassword = 'miPrincesa96';
      const hash = await bcrypt.hash(newPassword, 10);
      
      await pool.query(
        `UPDATE users SET password = $1 WHERE username = 'Santiago'`,
        [hash]
      );
      console.log('✅ Password refreshed');
    } else {
      console.log('❌ Santiago user not found, creating...');
      
      const newPassword = 'miPrincesa96';
      const hash = await bcrypt.hash(newPassword, 10);
      
      const createResult = await pool.query(
        `INSERT INTO users (username, password, email, "firstName", "lastName", role, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, username, email, role`,
        ['Santiago', hash, 'santiago@college.edu', 'Santiago', 'Admin', 'admin']
      );
      
      console.log('✅ Santiago user created:');
      console.log(`   ID: ${createResult.rows[0].id}`);
      console.log(`   Username: ${createResult.rows[0].username}`);
      console.log(`   Email: ${createResult.rows[0].email}`);
      console.log(`   Role: ${createResult.rows[0].role}`);
    }

    console.log();
    console.log('='.repeat(50));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(50));
    console.log();
    console.log('LOGIN CREDENTIALS:');
    console.log('  Username: Santiago');
    console.log('  Password: miPrincesa96');
    console.log();

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

verifySantiago();
