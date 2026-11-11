-- Library resources assigned directly to a task.

CREATE TABLE IF NOT EXISTS task_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  resource_id VARCHAR NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_task_resources_task ON task_resources(task_id);
CREATE INDEX IF NOT EXISTS idx_task_resources_resource ON task_resources(resource_id);
