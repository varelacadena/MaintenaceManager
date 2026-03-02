-- Add Resource Library tables

DO $$ BEGIN
  CREATE TYPE resource_type AS ENUM ('video', 'document', 'image', 'link');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS resource_categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(30) NOT NULL DEFAULT 'gray',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type resource_type NOT NULL,
  url TEXT NOT NULL,
  object_path TEXT,
  file_name VARCHAR(255),
  category_id VARCHAR REFERENCES resource_categories(id) ON DELETE SET NULL,
  created_by_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  resource_id VARCHAR NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category_id);
CREATE INDEX IF NOT EXISTS idx_property_resources_property ON property_resources(property_id);
CREATE INDEX IF NOT EXISTS idx_property_resources_resource ON property_resources(resource_id);

-- Seed default categories
INSERT INTO resource_categories (name, color) VALUES
  ('SOP', 'blue'),
  ('Manual', 'purple'),
  ('Asset Map', 'orange'),
  ('Cheat Sheet', 'yellow'),
  ('Safety', 'red'),
  ('Floor Plan', 'teal'),
  ('Equipment Manual', 'indigo'),
  ('General', 'gray')
ON CONFLICT (name) DO NOTHING;
