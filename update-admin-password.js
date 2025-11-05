const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const ws = require('ws');

const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

async function directDatabaseReset() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Direct database admin reset starting...\n');

    // Step 1: Delete all admin users
    console.log('Step 1: Clearing all admin users...');
    await pool.query(`DELETE FROM users WHERE username = 'admin' OR role = 'admin'`);
    console.log('✅ All admin users removed\n');

    // Step 2: Create password hash exactly like the server does
    console.log('Step 2: Creating password hash...');
    const password = 'Admin2025!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(`✅ Hash created (${hashedPassword.length} chars)\n`);

    // Step 3: Insert directly into database
    console.log('Step 3: Inserting new admin user...');
    const result = await pool.query(
      `INSERT INTO users (username, password, email, "firstName", "lastName", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, username, email, role`,
      ['admin', hashedPassword, 'admin@college.edu', 'Admin', 'User', 'admin']
    );

    const newUser = result.rows[0];
    console.log('✅ User inserted:', newUser.id, '\n');

    // Step 4: Verify by querying back
    console.log('Step 4: Verifying user exists...');
    const checkUser = await pool.query(
      `SELECT id, username, password, email, role FROM users WHERE username = 'admin'`
    );

    if (checkUser.rows.length === 0) {
      throw new Error('User not found after insert!');
    }

    const dbUser = checkUser.rows[0];
    console.log('✅ User found in database\n');

    // Step 5: Test password match
    console.log('Step 5: Testing password match...');
    const isMatch = await bcrypt.compare(password, dbUser.password);

    if (!isMatch) {
      throw new Error('Password verification FAILED!');
    }

    console.log('✅ Password verified successfully!\n');

    // Final output
    console.log('═══════════════════════════════════════════');
    console.log('✅ ADMIN RESET COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('Login Credentials:');
    console.log('  Username: admin');
    console.log('  Password: Admin2025!');
    console.log('');
    console.log('═══════════════════════════════════════════\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

directDatabaseReset();