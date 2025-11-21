-- Create uploads table for service request and task attachments
CREATE TABLE IF NOT EXISTS uploads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR REFERENCES tasks(id) ON DELETE CASCADE,
  request_id VARCHAR REFERENCES service_requests(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  object_url VARCHAR(1000) NOT NULL,
  uploaded_by_id VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add a check constraint to ensure at least one parent is provided (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uploads_parent_check'
    ) THEN
        ALTER TABLE uploads ADD CONSTRAINT uploads_parent_check 
          CHECK (request_id IS NOT NULL OR task_id IS NOT NULL);
    END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_uploads_task_id ON uploads(task_id);
CREATE INDEX IF NOT EXISTS idx_uploads_request_id ON uploads(request_id);
