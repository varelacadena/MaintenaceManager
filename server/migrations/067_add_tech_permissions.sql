-- Per-technician permissions for managing equipment, fleet, and inventory

ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_equipment BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_fleet BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_inventory BOOLEAN NOT NULL DEFAULT FALSE;
