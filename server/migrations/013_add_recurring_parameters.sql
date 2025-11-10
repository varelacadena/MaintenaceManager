
-- Add recurring parameters to tasks table
ALTER TABLE tasks ADD COLUMN recurring_frequency TEXT;
ALTER TABLE tasks ADD COLUMN recurring_interval INTEGER;
ALTER TABLE tasks ADD COLUMN recurring_end_date TEXT;
