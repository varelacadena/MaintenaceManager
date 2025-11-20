
-- Ensure uploads table has service_request_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploads' AND column_name = 'service_request_id'
  ) THEN
    ALTER TABLE uploads ADD COLUMN service_request_id INTEGER REFERENCES service_requests(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_uploads_service_request_id ON uploads(service_request_id);
  END IF;
END $$;
