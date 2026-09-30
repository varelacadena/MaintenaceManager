CREATE TABLE IF NOT EXISTS approved_drivers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  department varchar(120),
  email varchar(200),
  phone varchar(30),
  status varchar(20) NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT approved_drivers_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT approved_drivers_contact_check CHECK (
    (email IS NOT NULL AND btrim(email) <> '') OR (phone IS NOT NULL AND btrim(phone) <> '')
  )
);

CREATE INDEX IF NOT EXISTS idx_approved_drivers_last_name ON approved_drivers (last_name);

CREATE TABLE IF NOT EXISTS driver_penalties (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id varchar NOT NULL REFERENCES approved_drivers(id) ON DELETE CASCADE,
  reservation_id varchar,
  reason varchar(50) NOT NULL,
  note text,
  applied_by varchar REFERENCES users(id) ON DELETE SET NULL,
  applied_at timestamp DEFAULT now(),
  cleared_at timestamp,
  cleared_by varchar REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_driver_penalties_driver ON driver_penalties (driver_id);

ALTER TABLE vehicle_reservations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS driver_id varchar REFERENCES approved_drivers(id) ON DELETE RESTRICT;
ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS driver_name varchar(200);
ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS access_token varchar(64);
ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS trip_code varchar(12);
ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS link_revoked_at timestamp;
ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS revealed_lockbox_code varchar(50);

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_reservations_access_token_key
  ON vehicle_reservations (access_token)
  WHERE access_token IS NOT NULL;

ALTER TABLE vehicle_check_out_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE vehicle_check_in_logs ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'technician';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'driver_penalties_reservation_id_fkey'
  ) THEN
    ALTER TABLE driver_penalties
      ADD CONSTRAINT driver_penalties_reservation_id_fkey
      FOREIGN KEY (reservation_id) REFERENCES vehicle_reservations(id) ON DELETE SET NULL;
  END IF;
END $$;
