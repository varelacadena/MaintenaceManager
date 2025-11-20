
-- Drop the columns if they exist to ensure clean state
DO $$ 
BEGIN
    -- Drop vehicle_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'vehicle_id'
    ) THEN
        ALTER TABLE uploads DROP COLUMN vehicle_id;
    END IF;

    -- Drop check_out_log_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'check_out_log_id'
    ) THEN
        ALTER TABLE uploads DROP COLUMN check_out_log_id;
    END IF;

    -- Drop check_in_log_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'check_in_log_id'
    ) THEN
        ALTER TABLE uploads DROP COLUMN check_in_log_id;
    END IF;
END $$;

-- Now add the columns fresh
ALTER TABLE uploads
ADD COLUMN vehicle_id VARCHAR REFERENCES vehicles(id) ON DELETE CASCADE,
ADD COLUMN check_out_log_id VARCHAR REFERENCES vehicle_check_out_logs(id) ON DELETE CASCADE,
ADD COLUMN check_in_log_id VARCHAR REFERENCES vehicle_check_in_logs(id) ON DELETE CASCADE;

-- Ensure request_id and task_id are nullable
ALTER TABLE uploads 
ALTER COLUMN request_id DROP NOT NULL,
ALTER COLUMN task_id DROP NOT NULL;
