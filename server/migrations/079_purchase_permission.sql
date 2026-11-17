-- Let an admin grant the Purchases page to individual technicians.

ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_purchases BOOLEAN NOT NULL DEFAULT FALSE;
