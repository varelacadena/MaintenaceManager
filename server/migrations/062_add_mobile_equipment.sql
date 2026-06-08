-- Mobile / portable tools & equipment (separate from property-fixed equipment)

DO $$ BEGIN
  CREATE TYPE mobile_equipment_status AS ENUM (
    'available',
    'in_use',
    'needs_maintenance',
    'out_of_service'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS mobile_equipment (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'other',
  make VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(200),
  asset_tag VARCHAR(100),
  status mobile_equipment_status NOT NULL DEFAULT 'available',
  current_property_id VARCHAR REFERENCES properties(id) ON DELETE SET NULL,
  current_location_notes TEXT,
  notes TEXT,
  hours_or_meter DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_equipment_category ON mobile_equipment(category);
CREATE INDEX IF NOT EXISTS idx_mobile_equipment_status ON mobile_equipment(status);
CREATE INDEX IF NOT EXISTS idx_mobile_equipment_asset_tag ON mobile_equipment(asset_tag);

CREATE TABLE IF NOT EXISTS mobile_equipment_maintenance_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_equipment_id VARCHAR NOT NULL REFERENCES mobile_equipment(id) ON DELETE CASCADE,
  maintenance_date TIMESTAMP NOT NULL DEFAULT NOW(),
  type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  cost DOUBLE PRECISION DEFAULT 0,
  performed_by VARCHAR(200),
  hours_or_meter_at_maintenance DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_equipment_maintenance_logs_equipment
  ON mobile_equipment_maintenance_logs(mobile_equipment_id);

CREATE TABLE IF NOT EXISTS mobile_equipment_maintenance_parts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_log_id VARCHAR NOT NULL REFERENCES mobile_equipment_maintenance_logs(id) ON DELETE CASCADE,
  part_name VARCHAR(200) NOT NULL,
  part_number VARCHAR(200),
  quantity INTEGER DEFAULT 1,
  vendor VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_equipment_maintenance_parts_log
  ON mobile_equipment_maintenance_parts(maintenance_log_id);

CREATE INDEX IF NOT EXISTS idx_mobile_equipment_maintenance_parts_part_number
  ON mobile_equipment_maintenance_parts(part_number);
