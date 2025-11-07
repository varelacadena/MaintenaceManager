

-- Add property_id column to service_requests with correct type
ALTER TABLE service_requests 
ADD COLUMN property_id VARCHAR;

-- Add foreign key constraint
ALTER TABLE service_requests
ADD CONSTRAINT service_requests_property_id_fkey 
FOREIGN KEY (property_id) REFERENCES properties(id);

