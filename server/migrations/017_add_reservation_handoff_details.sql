
-- Add key pickup method, admin notes, and advisory acceptance to vehicle reservations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_reservations' 
    AND column_name = 'key_pickup_method'
  ) THEN
    ALTER TABLE vehicle_reservations ADD COLUMN key_pickup_method VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_reservations' 
    AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE vehicle_reservations ADD COLUMN admin_notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_reservations' 
    AND column_name = 'advisory_accepted'
  ) THEN
    ALTER TABLE vehicle_reservations ADD COLUMN advisory_accepted BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
