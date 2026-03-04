ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id VARCHAR;
ALTER TABLE vehicle_maintenance_logs ADD COLUMN IF NOT EXISTS task_id VARCHAR;

ALTER TABLE vehicle_maintenance_logs
  DROP CONSTRAINT IF EXISTS vehicle_maintenance_logs_task_id_tasks_id_fk;
ALTER TABLE vehicle_maintenance_logs
  ADD CONSTRAINT vehicle_maintenance_logs_task_id_tasks_id_fk
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
