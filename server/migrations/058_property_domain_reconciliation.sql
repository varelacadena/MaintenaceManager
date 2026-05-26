-- Reconcile property domain schema for fresh installs and older DBs

-- Spaces table (building sub-locations)
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  floor VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spaces_property_id ON spaces(property_id);

-- Equipment space assignment and manufacturer image
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES spaces(id) ON DELETE SET NULL;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS manufacturer_image_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_equipment_space_id ON equipment(space_id);

-- Upload columns used by later migrations/constraints
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS object_path VARCHAR(1000);
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS vehicle_check_out_log_id VARCHAR;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS vehicle_check_in_log_id VARCHAR;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS project_id VARCHAR;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS project_comment_id VARCHAR;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS label VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_uploads_equipment_id ON uploads(equipment_id);

-- Property type enum (optional upgrade from TEXT type column)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_type') THEN
    CREATE TYPE property_type AS ENUM (
      'building', 'lawn', 'parking', 'recreation', 'utility', 'road', 'other'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'type'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE properties
      ALTER COLUMN type TYPE property_type
      USING type::property_type;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'properties.type enum conversion skipped: %', SQLERRM;
END $$;
