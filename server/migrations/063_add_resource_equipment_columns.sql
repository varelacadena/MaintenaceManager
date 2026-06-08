-- Add equipment linking columns to resources (schema already expects these)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'equipment_id'
  ) THEN
    ALTER TABLE resources ADD COLUMN equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'equipment_category'
  ) THEN
    ALTER TABLE resources ADD COLUMN equipment_category VARCHAR(50);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_resources_equipment_id ON resources(equipment_id);
CREATE INDEX IF NOT EXISTS idx_resources_equipment_category ON resources(equipment_category);
CREATE INDEX IF NOT EXISTS idx_resources_folder_id ON resources(folder_id);
