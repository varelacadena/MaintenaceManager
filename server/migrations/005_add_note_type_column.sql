
-- Check if note_type enum exists, create if not
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'note_type') THEN
        CREATE TYPE note_type AS ENUM ('job_note', 'recommendation');
    END IF;
END $$;

-- Add note_type column if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_notes' AND column_name = 'note_type'
    ) THEN
        ALTER TABLE task_notes 
        ADD COLUMN note_type note_type NOT NULL DEFAULT 'job_note';
    END IF;
END $$;
