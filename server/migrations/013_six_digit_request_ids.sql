
-- Drop existing sequence
DROP SEQUENCE IF EXISTS service_requests_id_seq CASCADE;

-- Create new sequence starting at 100000 (first 6-digit number)
CREATE SEQUENCE service_requests_id_seq
  START WITH 100000
  INCREMENT BY 1
  MINVALUE 100000
  MAXVALUE 999999
  CYCLE;

-- Update the default value for the id column
ALTER TABLE service_requests 
  ALTER COLUMN id SET DEFAULT nextval('service_requests_id_seq');

-- If there are existing records, update them to start from 100000
DO $$
DECLARE
  rec RECORD;
  new_id INTEGER := 100000;
BEGIN
  FOR rec IN SELECT id FROM service_requests ORDER BY created_at LOOP
    EXECUTE 'UPDATE service_requests SET id = $1 WHERE id = $2' USING new_id, rec.id;
    EXECUTE 'UPDATE tasks SET request_id = $1 WHERE request_id = $2' USING new_id, rec.id;
    EXECUTE 'UPDATE messages SET request_id = $1 WHERE request_id = $2' USING new_id, rec.id;
    EXECUTE 'UPDATE uploads SET request_id = $1 WHERE request_id = $2' USING new_id, rec.id;
    new_id := new_id + 1;
  END LOOP;
  
  -- Set sequence to continue from last used ID
  PERFORM setval('service_requests_id_seq', new_id);
END $$;
