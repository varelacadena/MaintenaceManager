
-- Add recurring parameters to tasks table (only if they don't exist)
DO $$ 
BEGIN
    -- Add recurring_frequency if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'recurring_frequency'
    ) THEN
        ALTER TABLE tasks ADD COLUMN recurring_frequency TEXT;
    END IF;

    -- Add recurring_interval if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'recurring_interval'
    ) THEN
        ALTER TABLE tasks ADD COLUMN recurring_interval INTEGER;
    END IF;

    -- Add recurring_end_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'recurring_end_date'
    ) THEN
        ALTER TABLE tasks ADD COLUMN recurring_end_date TEXT;
    END IF;
END $$;
