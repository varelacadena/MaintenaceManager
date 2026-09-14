ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requester_email VARCHAR(200);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requester_phone VARCHAR(30);
