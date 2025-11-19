
-- Ensure vehicle-related columns exist in uploads table
DO $$ 
BEGIN
    -- Add vehicle_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'vehicle_id'
    ) THEN
        ALTER TABLE uploads ADD COLUMN vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE;
    END IF;

    -- Add check_out_log_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'check_out_log_id'
    ) THEN
        ALTER TABLE uploads ADD COLUMN check_out_log_id TEXT REFERENCES vehicle_check_out_logs(id) ON DELETE CASCADE;
    END IF;

    -- Add check_in_log_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'check_in_log_id'
    ) THEN
        ALTER TABLE uploads ADD COLUMN check_in_log_id TEXT REFERENCES vehicle_check_in_logs(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure requestId and taskId are nullable
ALTER TABLE uploads ALTER COLUMN request_id DROP NOT NULL;
ALTER TABLE uploads ALTER COLUMN task_id DROP NOT NULL;
