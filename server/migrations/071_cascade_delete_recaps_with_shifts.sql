-- Recaps belong to a clocked shift. Deleting the shift must delete the recap.

DELETE FROM student_daily_recaps WHERE time_entry_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'student_daily_recaps_time_entry_id_fkey'
      AND table_name = 'student_daily_recaps'
  ) THEN
    ALTER TABLE student_daily_recaps DROP CONSTRAINT student_daily_recaps_time_entry_id_fkey;
  END IF;
END $$;

ALTER TABLE student_daily_recaps
  ALTER COLUMN time_entry_id SET NOT NULL;

ALTER TABLE student_daily_recaps
  ADD CONSTRAINT student_daily_recaps_time_entry_id_fkey
  FOREIGN KEY (time_entry_id)
  REFERENCES student_time_entries(id)
  ON DELETE CASCADE;
