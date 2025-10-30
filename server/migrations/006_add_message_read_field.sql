
-- Add read field to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;

-- Mark all existing messages as read to avoid confusion
UPDATE messages SET read = true WHERE read IS NULL OR read = false;
