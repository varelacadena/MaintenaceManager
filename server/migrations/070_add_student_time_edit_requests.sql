CREATE TABLE IF NOT EXISTS student_time_edit_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  student_name VARCHAR(200) NOT NULL,
  time_entry_id VARCHAR REFERENCES student_time_entries(id) ON DELETE CASCADE,
  requested_clock_in_at TIMESTAMPTZ NOT NULL,
  requested_clock_out_at TIMESTAMPTZ,
  original_clock_in_at TIMESTAMPTZ NOT NULL,
  original_clock_out_at TIMESTAMPTZ,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_name VARCHAR(200),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS student_time_edit_requests_pending_entry
  ON student_time_edit_requests (time_entry_id)
  WHERE status = 'pending' AND time_entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_time_edit_requests_student
  ON student_time_edit_requests (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_time_edit_requests_status
  ON student_time_edit_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_time_edit_requests_entry
  ON student_time_edit_requests (time_entry_id);
