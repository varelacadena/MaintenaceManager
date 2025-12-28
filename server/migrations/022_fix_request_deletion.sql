
-- Fix foreign key constraint to allow service request deletion
-- Drop the existing constraint and recreate it with ON DELETE SET NULL

-- First, drop the constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_request_id_fkey'
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks DROP CONSTRAINT tasks_request_id_fkey;
    END IF;
END $$;

-- Now add the constraint with ON DELETE SET NULL
ALTER TABLE tasks
ADD CONSTRAINT tasks_request_id_fkey
FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE SET NULL;
