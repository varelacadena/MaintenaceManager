CREATE TABLE IF NOT EXISTS student_time_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  student_name VARCHAR(200) NOT NULL,
  supervisor_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  supervisor_name VARCHAR(200) NOT NULL,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS student_time_entries_open_session
  ON student_time_entries (student_id)
  WHERE clock_out_at IS NULL AND student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_time_entries_student
  ON student_time_entries (student_id, clock_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_time_entries_supervisor
  ON student_time_entries (supervisor_id, clock_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_time_entries_clock_in
  ON student_time_entries (clock_in_at DESC);

CREATE TABLE IF NOT EXISTS student_daily_recaps (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  student_name VARCHAR(200) NOT NULL,
  time_entry_id VARCHAR REFERENCES student_time_entries(id) ON DELETE SET NULL,
  recap_date DATE NOT NULL,
  what_i_did TEXT NOT NULL,
  what_i_learned TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_recaps_student_date
  ON student_daily_recaps (student_id, recap_date DESC);

CREATE INDEX IF NOT EXISTS idx_student_recaps_date
  ON student_daily_recaps (recap_date DESC);

CREATE INDEX IF NOT EXISTS idx_student_recaps_time_entry
  ON student_daily_recaps (time_entry_id);
