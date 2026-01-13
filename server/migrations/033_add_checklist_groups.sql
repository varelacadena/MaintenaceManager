-- Migration: Add grouped/named checklists for tasks

-- Create task_checklist_groups table
CREATE TABLE IF NOT EXISTS task_checklist_groups (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create task_checklist_items table
CREATE TABLE IF NOT EXISTS task_checklist_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id VARCHAR NOT NULL REFERENCES task_checklist_groups(id) ON DELETE CASCADE,
  text VARCHAR(500) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checklist_groups_task_id ON task_checklist_groups(task_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_group_id ON task_checklist_items(group_id);
