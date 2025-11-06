-- Migration to add properties and equipment tables for the property map system

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  coordinates JSONB,
  address TEXT,
  "imageUrl" TEXT,
  "lastWorkDate" TIMESTAMP WITH TIME ZONE
);

-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "propertyId" UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  "serialNumber" TEXT,
  condition TEXT,
  notes TEXT,
  "imageUrl" TEXT
);

-- Add propertyId to tasks table (optional field for linking tasks to properties)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "propertyId" UUID REFERENCES properties(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_property_id ON equipment("propertyId");
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON tasks("propertyId");
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
