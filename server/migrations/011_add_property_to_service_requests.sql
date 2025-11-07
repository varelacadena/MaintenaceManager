
-- Add property_id column to service_requests
ALTER TABLE service_requests 
ADD COLUMN property_id VARCHAR REFERENCES properties(id);
