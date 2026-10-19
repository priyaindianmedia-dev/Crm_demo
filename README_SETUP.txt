CLIENTFLOW CRM — NODE.JS + MYSQL AUTH SETUP (WINDOWS)

WHAT THIS DOES
- Registration saves full name, email, and a bcrypt-hashed password in MySQL.
- Login checks the password hash (never stores plaintext passwords).
- Each successful login inserts user_id, email, and login_time into login_events.
- Successful registration/login takes the user into the existing CRM dashboard.
- Existing clientflow_crm database and tables are not dropped.

IMPORTANT EXISTING PROJECT LIMITATION
The original HTML has Supabase/demo data logic for leads, follow-ups, reports, and CRM settings. This conversion makes registration/login and login tracking use MySQL, but the CRM lead data itself still uses the original browser-local demo store unless separately migrated. Do not assume leads are persisted to MySQL yet.

1. INSTALL NODE.JS
Install Node.js 18 or newer from https://nodejs.org/ . Restart Command Prompt after installation.
Check:
  node -v
  npm -v

2. BACK UP YOUR DATABASE FIRST
In MySQL Workbench, select clientflow_crm and export a backup before changing tables.

3. CHECK YOUR EXISTING TABLE COLUMNS
In MySQL Workbench, run:
  USE clientflow_crm;
  SHOW COLUMNS FROM users;
  SHOW COLUMNS FROM login_events;
The current frontend query you showed uses users.full_name, users.email, login_events.user_id, login_events.email, and login_events.login_time.

4. RUN MYSQL SETUP
Open mysql_setup.sql in Workbench and run it. It creates missing tables but does not overwrite existing tables.
If users exists but has no password_hash column, run the commented ALTER TABLE statement in mysql_setup.sql exactly once. Ensure users.email has a UNIQUE index. If your existing users.id type is not BIGINT UNSIGNED, make login_events.user_id use the same type before testing (the foreign key is intentionally not imposed by this script to avoid breaking existing schema).

5. SET UP THE NODE APP
Extract this folder to a location such as C:\\ClientFlowCRM.
Open Command Prompt in that folder and run:
  copy .env.example .env
Open .env in Notepad and set DB_PASSWORD to your MySQL root password. Replace JWT_SECRET with a long random value (at least 32 characters). Keep .env private; do not send it to anyone or upload it publicly.

Then run:
  npm install
  npm start

6. OPEN THE CRM
Open http://localhost:3000 in your browser. Do not double-click telecrm.html (file:// URLs cannot call the local API correctly).
Create an account using full name, email, and a new password of at least 8 characters. It should redirect to the CRM dashboard. Log out, then log in again with the same credentials.

7. VERIFY MYSQL LOGIN TRACKING
In Workbench, run:
  USE clientflow_crm;
  SELECT u.full_name, u.email, l.login_time
  FROM login_events AS l
  JOIN users AS u ON u.id = l.user_id
  ORDER BY l.login_time DESC;
A row is recorded for each successful login. Registration itself does not create a login_events row; the first explicit login does.

TROUBLESHOOTING
- “Cannot connect to MySQL”: check MySQL80 is running and DB_PASSWORD/database name in .env.
- “Check users and login_events table columns”: compare SHOW COLUMNS results with the names above. Existing schemas may need a careful migration.
- “An account with this email already exists”: log in rather than registering again.
- If the existing users table has rows without password_hash values, those accounts cannot authenticate with this new system until a password is set/reset securely.
- Password reset email and Google login are not configured in this version; the UI tells users to contact an administrator for password reset.

SECURITY NOTES
Use HTTPS and a production-grade session/token strategy before deploying publicly. The app uses a bearer token in sessionStorage for this local starter and a development Node process; do not expose MySQL directly to the internet. Do not use root DB credentials for production—create a dedicated MySQL user with only required permissions.
