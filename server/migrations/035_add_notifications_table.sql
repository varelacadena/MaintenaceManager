-- Create notification type enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('document_expiration', 'task_reminder', 'task_due', 'task_overdue', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    related_id VARCHAR,
    related_type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
