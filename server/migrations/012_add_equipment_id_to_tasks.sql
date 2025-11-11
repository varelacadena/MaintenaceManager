
-- Add equipment_id column to tasks table (only if it doesn't exist)

DO $$ 
BEGIN
    -- Add equipment_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'equipment_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN equipment_id uuid;
    END IF;

    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_equipment_id_fkey'
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks
        ADD CONSTRAINT tasks_equipment_id_fkey 
        FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for better query performance (IF NOT EXISTS is already idempotent)
CREATE INDEX IF NOT EXISTS idx_tasks_equipment_id ON tasks(equipment_id);
