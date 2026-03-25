-- Fix uploads_parent_check constraint to include project_id
-- Project uploads only set project_id, not task_id/request_id/vehicle log IDs

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uploads_parent_check') THEN
        ALTER TABLE uploads DROP CONSTRAINT uploads_parent_check;
    END IF;
END $$;

ALTER TABLE uploads ADD CONSTRAINT uploads_parent_check 
CHECK (request_id IS NOT NULL OR task_id IS NOT NULL OR vehicle_check_out_log_id IS NOT NULL OR vehicle_check_in_log_id IS NOT NULL OR project_id IS NOT NULL);
