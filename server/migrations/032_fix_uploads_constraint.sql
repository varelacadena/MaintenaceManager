-- Fix the uploads_parent_check constraint to include vehicle checkout/checkin log IDs
-- Also ensure object_path column is nullable

-- Make object_path nullable if not already
ALTER TABLE uploads ALTER COLUMN object_path DROP NOT NULL;

-- Drop the old constraint if it exists and recreate with vehicle log support
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uploads_parent_check') THEN
        ALTER TABLE uploads DROP CONSTRAINT uploads_parent_check;
    END IF;
END $$;

ALTER TABLE uploads ADD CONSTRAINT uploads_parent_check 
CHECK (request_id IS NOT NULL OR task_id IS NOT NULL OR vehicle_check_out_log_id IS NOT NULL OR vehicle_check_in_log_id IS NOT NULL);
