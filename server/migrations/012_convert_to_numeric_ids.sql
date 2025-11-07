
-- Drop all foreign key constraints first
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_request_id_service_requests_id_fk;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_request_id_service_requests_id_fk;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_task_id_tasks_id_fk;
ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_request_id_service_requests_id_fk;
ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_task_id_tasks_id_fk;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_task_id_tasks_id_fk;
ALTER TABLE parts_used DROP CONSTRAINT IF EXISTS parts_used_task_id_tasks_id_fk;
ALTER TABLE task_notes DROP CONSTRAINT IF EXISTS task_notes_task_id_tasks_id_fk;

-- Create temporary mapping tables
CREATE TEMP TABLE request_id_mapping (
  old_id uuid,
  new_id serial
);

CREATE TEMP TABLE task_id_mapping (
  old_id uuid,
  new_id serial
);

-- Populate mapping tables
INSERT INTO request_id_mapping (old_id)
SELECT id FROM service_requests ORDER BY created_at;

INSERT INTO task_id_mapping (old_id)
SELECT id FROM tasks ORDER BY initial_date;

-- Add new integer columns
ALTER TABLE service_requests ADD COLUMN new_id INTEGER;
ALTER TABLE tasks ADD COLUMN new_id INTEGER;
ALTER TABLE tasks ADD COLUMN new_request_id INTEGER;
ALTER TABLE messages ADD COLUMN new_request_id INTEGER;
ALTER TABLE messages ADD COLUMN new_task_id INTEGER;
ALTER TABLE uploads ADD COLUMN new_request_id INTEGER;
ALTER TABLE uploads ADD COLUMN new_task_id INTEGER;
ALTER TABLE time_entries ADD COLUMN new_task_id INTEGER;
ALTER TABLE parts_used ADD COLUMN new_task_id INTEGER;
ALTER TABLE task_notes ADD COLUMN new_task_id INTEGER;

-- Update with new IDs
UPDATE service_requests sr
SET new_id = rim.new_id
FROM request_id_mapping rim
WHERE sr.id = rim.old_id;

UPDATE tasks t
SET new_id = tim.new_id
FROM task_id_mapping tim
WHERE t.id = tim.old_id;

UPDATE tasks t
SET new_request_id = rim.new_id
FROM request_id_mapping rim
WHERE t.request_id = rim.old_id;

UPDATE messages m
SET new_request_id = rim.new_id
FROM request_id_mapping rim
WHERE m.request_id = rim.old_id;

UPDATE messages m
SET new_task_id = tim.new_id
FROM task_id_mapping tim
WHERE m.task_id = tim.old_id;

UPDATE uploads u
SET new_request_id = rim.new_id
FROM request_id_mapping rim
WHERE u.request_id = rim.old_id;

UPDATE uploads u
SET new_task_id = tim.new_id
FROM task_id_mapping tim
WHERE u.task_id = tim.old_id;

UPDATE time_entries te
SET new_task_id = tim.new_id
FROM task_id_mapping tim
WHERE te.task_id = tim.old_id;

UPDATE parts_used pu
SET new_task_id = tim.new_id
FROM task_id_mapping tim
WHERE pu.task_id = tim.old_id;

UPDATE task_notes tn
SET new_task_id = tim.new_id
FROM task_id_mapping tim
WHERE tn.task_id = tim.old_id;

-- Drop old columns
ALTER TABLE service_requests DROP COLUMN id;
ALTER TABLE tasks DROP COLUMN id;
ALTER TABLE tasks DROP COLUMN request_id;
ALTER TABLE messages DROP COLUMN request_id;
ALTER TABLE messages DROP COLUMN task_id;
ALTER TABLE uploads DROP COLUMN request_id;
ALTER TABLE uploads DROP COLUMN task_id;
ALTER TABLE time_entries DROP COLUMN task_id;
ALTER TABLE parts_used DROP COLUMN task_id;
ALTER TABLE task_notes DROP COLUMN task_id;

-- Rename new columns to original names
ALTER TABLE service_requests RENAME COLUMN new_id TO id;
ALTER TABLE tasks RENAME COLUMN new_id TO id;
ALTER TABLE tasks RENAME COLUMN new_request_id TO request_id;
ALTER TABLE messages RENAME COLUMN new_request_id TO request_id;
ALTER TABLE messages RENAME COLUMN new_task_id TO task_id;
ALTER TABLE uploads RENAME COLUMN new_request_id TO request_id;
ALTER TABLE uploads RENAME COLUMN new_task_id TO task_id;
ALTER TABLE time_entries RENAME COLUMN new_task_id TO task_id;
ALTER TABLE parts_used RENAME COLUMN new_task_id TO task_id;
ALTER TABLE task_notes RENAME COLUMN new_task_id TO task_id;

-- Add primary keys
ALTER TABLE service_requests ADD PRIMARY KEY (id);
ALTER TABLE tasks ADD PRIMARY KEY (id);

-- Create sequences for auto-increment
CREATE SEQUENCE IF NOT EXISTS service_requests_id_seq OWNED BY service_requests.id;
CREATE SEQUENCE IF NOT EXISTS tasks_id_seq OWNED BY tasks.id;

-- Set sequence values to max current ID + 1
SELECT setval('service_requests_id_seq', COALESCE((SELECT MAX(id) FROM service_requests), 0) + 1, false);
SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 0) + 1, false);

-- Set default values for ID columns
ALTER TABLE service_requests ALTER COLUMN id SET DEFAULT nextval('service_requests_id_seq');
ALTER TABLE tasks ALTER COLUMN id SET DEFAULT nextval('tasks_id_seq');

-- Re-add foreign key constraints
ALTER TABLE tasks ADD CONSTRAINT tasks_request_id_service_requests_id_fk 
  FOREIGN KEY (request_id) REFERENCES service_requests(id);
ALTER TABLE messages ADD CONSTRAINT messages_request_id_service_requests_id_fk 
  FOREIGN KEY (request_id) REFERENCES service_requests(id);
ALTER TABLE messages ADD CONSTRAINT messages_task_id_tasks_id_fk 
  FOREIGN KEY (task_id) REFERENCES tasks(id);
ALTER TABLE uploads ADD CONSTRAINT uploads_request_id_service_requests_id_fk 
  FOREIGN KEY (request_id) REFERENCES service_requests(id);
ALTER TABLE uploads ADD CONSTRAINT uploads_task_id_tasks_id_fk 
  FOREIGN KEY (task_id) REFERENCES tasks(id);
ALTER TABLE time_entries ADD CONSTRAINT time_entries_task_id_tasks_id_fk 
  FOREIGN KEY (task_id) REFERENCES tasks(id) NOT NULL;
ALTER TABLE parts_used ADD CONSTRAINT parts_used_task_id_tasks_id_fk 
  FOREIGN KEY (task_id) REFERENCES tasks(id) NOT NULL;
ALTER TABLE task_notes ADD CONSTRAINT task_notes_task_id_tasks_id_fk 
  FOREIGN KEY (task_id) REFERENCES tasks(id) NOT NULL;
