
-- Make both request_id and task_id nullable in uploads table (PostgreSQL)
-- This allows uploads to be attached to either tasks OR requests
ALTER TABLE uploads ALTER COLUMN request_id DROP NOT NULL;
ALTER TABLE uploads ALTER COLUMN task_id DROP NOT NULL;

-- Add a check constraint to ensure at least one is provided (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uploads_parent_check'
    ) THEN
        ALTER TABLE uploads ADD CONSTRAINT uploads_parent_check 
          CHECK (request_id IS NOT NULL OR task_id IS NOT NULL);
    END IF;
END $$;
