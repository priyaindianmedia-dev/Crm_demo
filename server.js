require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const helmet = require('helmet');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
const PORT = Number(process.env.PORT || 3000);
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clientflow_crm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('ERROR: Set JWT_SECRET in .env to a random secret at least 32 characters long.');
  process.exit(1);
}

function tokenFor(user) {
  return jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, { expiresIn: '12h' });
}
function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Please log in.' });
  try { req.auth = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Your session expired. Please log in again.' }); }
}

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: process.env.DB_NAME || 'clientflow_crm' }); }
  catch (e) { res.status(500).json({ ok: false, error: 'Cannot connect to MySQL. Check .env and database setup.' }); }
});

app.post('/api/auth/register', async (req, res) => {
  const full_name = String(req.body.full_name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (full_name.length < 2 || full_name.length > 120) return res.status(400).json({ error: 'Enter your full name (2–120 characters).' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 200) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const password_hash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)', [full_name, email, password_hash]);
    const user = { id: result.insertId, full_name, email };
    // Registration creates the account and signs the user in; login_events records successful logins only.
    return res.status(201).json({ token: tokenFor(user), user });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    console.error('Registration error:', e.code || e.message);
    return res.status(500).json({ error: 'Could not create account. Check the users table setup.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
  try {
    const [rows] = await pool.execute('SELECT id, full_name, email, password_hash FROM users WHERE email = ? LIMIT 1', [email]);
    const userRow = rows[0];
    if (!userRow || !userRow.password_hash || !(await bcrypt.compare(password, userRow.password_hash))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    await pool.execute('INSERT INTO login_events (user_id, email, login_time) VALUES (?, ?, NOW())', [userRow.id, userRow.email]);
    const user = { id: userRow.id, full_name: userRow.full_name, email: userRow.email };
    return res.json({ token: tokenFor(user), user });
  } catch (e) {
    console.error('Login error:', e.code || e.message);
    return res.status(500).json({ error: 'Login could not be completed. Check users and login_events table columns.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, full_name, email FROM users WHERE id = ? LIMIT 1', [req.auth.sub]);
    if (!rows[0]) return res.status(401).json({ error: 'Account not found. Please log in again.' });
    res.json({ user: rows[0] });
  } catch (e) {
    console.error('Session lookup error:', e.code || e.message);
    res.status(500).json({ error: 'Could not load account.' });
  }
});

// Serve the CRM from the same origin as the API (do not open the HTML via file://).
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'telecrm.html')));
app.use(express.static(__dirname, { index: false, dotfiles: 'ignore' }));
app.listen(PORT, () => console.log(`ClientFlow CRM running at http://localhost:${PORT}`));
