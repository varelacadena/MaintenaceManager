-- Add campus-wide and multi-building location scope columns to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_campus_wide boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS property_ids text[];
