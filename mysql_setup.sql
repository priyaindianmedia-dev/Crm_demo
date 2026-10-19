USE clientflow_crm;

-- If the users table does not exist, create it. Existing users table is preserved by IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If users already existed before this project, check whether password_hash exists first.
-- Run this ALTER only if SHOW COLUMNS FROM users LIKE 'password_hash' returns no rows:
-- ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL;
-- Also ensure email has a UNIQUE index. Check with: SHOW INDEX FROM users;

-- This matches the columns used in the existing ClientFlow query: user_id, email, login_time.
CREATE TABLE IF NOT EXISTS login_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(254) NOT NULL,
  login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_login_events_user_id (user_id),
  KEY idx_login_events_login_time (login_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inspect the resulting schema. Existing tables are not overwritten.
SHOW COLUMNS FROM users;
SHOW COLUMNS FROM login_events;
