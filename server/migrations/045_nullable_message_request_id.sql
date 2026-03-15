-- Make request_id nullable on messages table so messages can be sent on tasks without a linked service request
ALTER TABLE messages ALTER COLUMN request_id DROP NOT NULL;
