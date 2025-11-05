
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const ws = require('ws');

const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

async function testAndReset() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('='.repeat(50));
    console.log('ADMIN CREDENTIAL TEST & RESET');
    console.log('='.repeat(50));
    console.log();

    // Test database connection
    console.log('Testing database connection...');
    const connectionTest = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', connectionTest.rows[0].now);
    console.log();

    // Check current admin users
    console.log('Checking existing admin users...');
    const existingUsers = await pool.query(
      `SELECT id, username, email, role FROM users WHERE username = 'admin' OR role = 'admin'`
    );
    console.log(`Found ${existingUsers.rows.length} admin user(s)`);
    existingUsers.rows.forEach(u => {
      console.log(`  - ID: ${u.id}, Username: ${u.username}, Email: ${u.email}, Role: ${u.role}`);
    });
    console.log();

    // Delete ALL admin users
    console.log('Deleting all admin users...');
    const deleteResult = await pool.query(`DELETE FROM users WHERE username = 'admin' OR role = 'admin'`);
    console.log(`✅ Deleted ${deleteResult.rowCount} user(s)`);
    console.log();

    // Create fresh password
    console.log('Creating new password hash...');
    const plainPassword = 'Admin2025!';
    const hash = await bcrypt.hash(plainPassword, 10);
    console.log(`✅ Hash created (length: ${hash.length})`);
    console.log(`   First 20 chars: ${hash.substring(0, 20)}...`);
    console.log();

    // Insert new admin user
    console.log('Creating new admin user...');
    const insertResult = await pool.query(
      `INSERT INTO users (username, password, email, "firstName", "lastName", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, username, email, role`,
      ['admin', hash, 'admin@college.edu', 'Admin', 'User', 'admin']
    );
    
    const newUser = insertResult.rows[0];
    console.log('✅ User created:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role}`);
    console.log();

    // Verify user exists
    console.log('Verifying user in database...');
    const verifyResult = await pool.query(
      `SELECT id, username, password, email, role FROM users WHERE username = 'admin'`
    );
    
    if (verifyResult.rows.length === 0) {
      throw new Error('User not found after creation!');
    }
    console.log('✅ User found in database');
    console.log();

    // Test password comparison
    console.log('Testing password verification...');
    const dbUser = verifyResult.rows[0];
    const correctPasswordMatch = await bcrypt.compare(plainPassword, dbUser.password);
    const wrongPasswordMatch = await bcrypt.compare('WrongPassword', dbUser.password);
    
    if (!correctPasswordMatch) {
      throw new Error('❌ CORRECT password does not match!');
    }
    if (wrongPasswordMatch) {
      throw new Error('❌ WRONG password matched!');
    }
    
    console.log('✅ Password verification works correctly');
    console.log('   - Correct password: MATCH ✓');
    console.log('   - Wrong password: NO MATCH ✓');
    console.log();

    // Final success message
    console.log('='.repeat(50));
    console.log('✅ ADMIN RESET SUCCESSFUL');
    console.log('='.repeat(50));
    console.log();
    console.log('LOGIN CREDENTIALS:');
    console.log('  Username: admin');
    console.log('  Password: Admin2025!');
    console.log();
    console.log('='.repeat(50));
    console.log();
    console.log('🔍 If login still fails, the issue is in the login endpoint,');
    console.log('   not the database credentials.');
    console.log();

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error();
    console.error('❌ ERROR:', error.message);
    console.error();
    console.error('Stack trace:');
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

testAndReset();
