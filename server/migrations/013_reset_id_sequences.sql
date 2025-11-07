
-- Reset service requests sequence
TRUNCATE TABLE service_requests RESTART IDENTITY CASCADE;

-- Reset tasks sequence  
TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;

-- Ensure sequences start from 1
ALTER SEQUENCE service_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE tasks_id_seq RESTART WITH 1;
