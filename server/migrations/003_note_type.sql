
-- Add note type enum and column to task_notes table
CREATE TYPE note_type AS ENUM ('job_note', 'recommendation');

ALTER TABLE task_notes 
ADD COLUMN note_type note_type NOT NULL DEFAULT 'job_note';
