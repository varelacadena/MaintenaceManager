DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pending_user_status') THEN
    CREATE TYPE pending_user_status AS ENUM('pending', 'approved', 'denied', 'expired');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS pending_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL,
  password VARCHAR NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone_number VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  requested_role VARCHAR(20) NOT NULL DEFAULT 'staff',
  requested_property VARCHAR(200),
  status pending_user_status NOT NULL DEFAULT 'pending',
  denial_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR
);
