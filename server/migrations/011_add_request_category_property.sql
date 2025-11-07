-- Add category and property_id columns to service_requests table
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS category varchar(100);

ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS property_id varchar REFERENCES properties(id);
