-- Add space_id column to projects table for linking projects to specific spaces within buildings
ALTER TABLE projects ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES spaces(id);
