-- Add equipment_id column to uploads table for equipment file attachments
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE;
