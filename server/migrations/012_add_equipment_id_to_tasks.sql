
-- Add equipment_id column to tasks table

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS equipment_id uuid;

-- Add foreign key constraint
ALTER TABLE tasks
ADD CONSTRAINT tasks_equipment_id_fkey 
FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_equipment_id ON tasks(equipment_id);
