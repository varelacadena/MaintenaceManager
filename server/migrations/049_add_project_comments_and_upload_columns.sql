CREATE TABLE IF NOT EXISTS project_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id VARCHAR NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE uploads ADD COLUMN IF NOT EXISTS project_id VARCHAR;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS project_comment_id VARCHAR;
