-- Migration: 034_add_emergency_contacts
-- Description: Add emergency contacts table for after-hours contact management

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(200),
  role VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  assigned_by_id VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
