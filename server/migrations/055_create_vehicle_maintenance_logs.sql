-- Ensure vehicle maintenance logs table exists (some DBs only had ALTER migrations)
CREATE TABLE IF NOT EXISTS vehicle_maintenance_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id VARCHAR NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  task_id VARCHAR REFERENCES tasks(id) ON DELETE SET NULL,
  maintenance_date TIMESTAMP NOT NULL DEFAULT NOW(),
  type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  cost DOUBLE PRECISION DEFAULT 0,
  mileage_at_maintenance INTEGER,
  performed_by VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_logs_vehicle
  ON vehicle_maintenance_logs(vehicle_id);
