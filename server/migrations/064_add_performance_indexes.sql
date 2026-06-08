-- Hot-path indexes for navigation-heavy list and count endpoints.
CREATE INDEX IF NOT EXISTS idx_tasks_status_initial_date
  ON tasks (task_status, initial_date DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_status
  ON tasks (assigned_to_id, task_status);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_pool_status
  ON tasks (assigned_pool, task_status);

CREATE INDEX IF NOT EXISTS idx_tasks_area_initial_date
  ON tasks (area_id, initial_date DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_estimated_completion_date
  ON tasks (estimated_completion_date);

CREATE INDEX IF NOT EXISTS idx_task_helpers_user
  ON task_helpers (user_id);

CREATE INDEX IF NOT EXISTS idx_task_helpers_task
  ON task_helpers (task_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_requester_created
  ON service_requests (requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_requests_status_created
  ON service_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_user_start
  ON vehicle_reservations (user_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_status_start
  ON vehicle_reservations (status, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_vehicle_start
  ON vehicle_reservations (vehicle_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_state_created
  ON notifications (user_id, is_read, is_dismissed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_global_state_created
  ON notifications (is_read, is_dismissed, created_at DESC);
