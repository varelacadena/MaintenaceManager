-- Add project management tables and related columns

-- Create project_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create project_priority enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create project_team_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE project_team_role AS ENUM ('manager', 'lead', 'technician', 'support');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create project_vendor_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE project_vendor_role AS ENUM ('primary', 'subcontractor', 'consultant', 'supplier');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create quote_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM ('requested', 'submitted', 'under_review', 'approved', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create projects table (property_id uses UUID to match properties table)
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'planning',
  priority project_priority NOT NULL DEFAULT 'medium',
  property_id UUID REFERENCES properties(id),
  area_id VARCHAR REFERENCES areas(id),
  start_date TIMESTAMP,
  target_end_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  budget_amount DOUBLE PRECISION DEFAULT 0,
  notes TEXT,
  created_by_id VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create project_team_members table
CREATE TABLE IF NOT EXISTS project_team_members (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role project_team_role NOT NULL DEFAULT 'technician',
  allocation_hours INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create project_vendors table
CREATE TABLE IF NOT EXISTS project_vendors (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id VARCHAR NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  role project_vendor_role NOT NULL DEFAULT 'primary',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR REFERENCES projects(id) ON DELETE CASCADE,
  task_id VARCHAR REFERENCES tasks(id) ON DELETE CASCADE,
  vendor_id VARCHAR NOT NULL REFERENCES vendors(id),
  status quote_status NOT NULL DEFAULT 'requested',
  total_amount DOUBLE PRECISION DEFAULT 0,
  valid_until TIMESTAMP,
  notes TEXT,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by_id VARCHAR REFERENCES users(id),
  rejection_reason TEXT,
  created_by_id VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create quote_items table
CREATE TABLE IF NOT EXISTS quote_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id VARCHAR NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  line_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  inventory_item_id VARCHAR REFERENCES inventory_items(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add project_id column to tasks if it doesn't exist
DO $$ BEGIN
  ALTER TABLE tasks ADD COLUMN project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_project ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_vendors_project ON project_vendors(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_project ON quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_vendor ON quotes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
