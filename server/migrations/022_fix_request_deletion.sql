
-- Fix foreign key constraint to allow service request deletion
-- Drop the existing constraint and recreate it with ON DELETE SET NULL

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_request_id_fkey;

ALTER TABLE tasks
ADD CONSTRAINT tasks_request_id_fkey
FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE SET NULL;
