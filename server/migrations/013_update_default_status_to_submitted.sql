
-- Update default status for service_requests from 'pending' to 'submitted'
ALTER TABLE service_requests 
ALTER COLUMN status SET DEFAULT 'submitted';

-- Update any existing requests with 'pending' status to 'submitted'
UPDATE service_requests 
SET status = 'submitted' 
WHERE status = 'pending';
