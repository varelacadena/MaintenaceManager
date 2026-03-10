-- Add resource_folders table for organizing library resources
CREATE TABLE IF NOT EXISTS resource_folders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  parent_id VARCHAR REFERENCES resource_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add folder_id column to resources table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE resources ADD COLUMN folder_id VARCHAR REFERENCES resource_folders(id) ON DELETE SET NULL;
  END IF;
END $$;
