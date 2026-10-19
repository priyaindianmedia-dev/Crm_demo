
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('readline');

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log('Usage: node reset-password.js user@example.com');
    process.exitCode = 1;
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  try {
    const password = await ask('Enter new password (minimum 8 characters): ');
    const confirm = await ask('Confirm new password: ');

    if (password.length < 8 || password.length > 200 || password !== confirm) {
      throw new Error('Passwords must match and contain 8–200 characters.');
    }

    const pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clientflow_crm'
    });

    try {
      const hash = await bcrypt.hash(password, 12);
      const [result] = await pool.execute(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        [hash, email]
      );

      if (result.affectedRows === 0) {
        throw new Error('No matching account found.');
      }

      console.log('Password reset successfully.');
    } finally {
      await pool.end();
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
