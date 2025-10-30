
-- Add read column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for faster queries on unread messages
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
