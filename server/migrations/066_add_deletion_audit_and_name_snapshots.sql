-- Deletion audit trail and display-name snapshots for preserved work history

CREATE TABLE IF NOT EXISTS deletion_audit_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR NOT NULL,
  entity_label VARCHAR(500),
  deleted_by_id VARCHAR NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_entity ON deletion_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_by ON deletion_audit_log (deleted_by_id, deleted_at DESC);

CREATE TABLE IF NOT EXISTS deleted_entity_registry (
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR NOT NULL,
  display_label VARCHAR(500) NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by_id VARCHAR REFERENCES users(id),
  PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_deleted_entity_registry_deleted_at ON deleted_entity_registry (deleted_at DESC);

-- Task display-name snapshots
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(200);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(200);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS contact_staff_name VARCHAR(200);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS property_name VARCHAR(200);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS space_name VARCHAR(200);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS equipment_name VARCHAR(200);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS vehicle_name VARCHAR(200);

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS user_name VARCHAR(200);
ALTER TABLE task_notes ADD COLUMN IF NOT EXISTS user_name VARCHAR(200);

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requester_name VARCHAR(200);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS property_name VARCHAR(200);

ALTER TABLE uploads ADD COLUMN IF NOT EXISTS uploaded_by_name VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(200);
ALTER TABLE project_comments ADD COLUMN IF NOT EXISTS sender_name VARCHAR(200);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(200);
ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS assigned_by_name VARCHAR(200);

-- Allow detaching users while keeping name snapshots
ALTER TABLE tasks ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE time_entries ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE task_notes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE service_requests ALTER COLUMN requester_id DROP NOT NULL;
ALTER TABLE uploads ALTER COLUMN uploaded_by_id DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE project_comments ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE quotes ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE emergency_contacts ALTER COLUMN assigned_by_id DROP NOT NULL;

-- Backfill task name snapshots from live relations
UPDATE tasks t
SET created_by_name = COALESCE(
  t.created_by_name,
  NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
  u.username
)
FROM users u
WHERE t.created_by_id = u.id AND t.created_by_name IS NULL;

UPDATE tasks t
SET assigned_to_name = COALESCE(
  t.assigned_to_name,
  NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
  u.username
)
FROM users u
WHERE t.assigned_to_id = u.id AND t.assigned_to_name IS NULL;

UPDATE tasks t
SET contact_staff_name = COALESCE(
  t.contact_staff_name,
  NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
  u.username
)
FROM users u
WHERE t.contact_staff_id = u.id AND t.contact_staff_name IS NULL;

UPDATE tasks t
SET property_name = COALESCE(t.property_name, p.name)
FROM properties p
WHERE t.property_id = p.id AND t.property_name IS NULL;

UPDATE tasks t
SET space_name = COALESCE(t.space_name, s.name)
FROM spaces s
WHERE t.space_id = s.id AND t.space_name IS NULL;

UPDATE tasks t
SET equipment_name = COALESCE(t.equipment_name, e.name)
FROM equipment e
WHERE t.equipment_id = e.id AND t.equipment_name IS NULL;

UPDATE tasks t
SET vehicle_name = COALESCE(
  t.vehicle_name,
  CONCAT(v.year::text, ' ', v.make, ' ', v.model)
)
FROM vehicles v
WHERE t.vehicle_id = v.id AND t.vehicle_name IS NULL;

UPDATE time_entries te
SET user_name = COALESCE(
  te.user_name,
  NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
  u.username
)
FROM users u
WHERE te.user_id = u.id AND te.user_name IS NULL;

UPDATE task_notes tn
SET user_name = COALESCE(
  tn.user_name,
  NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
  u.username
)
FROM users u
WHERE tn.user_id = u.id AND tn.user_name IS NULL;

UPDATE service_requests sr
SET requester_name = COALESCE(
  sr.requester_name,
  NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
  u.username
)
FROM users u
WHERE sr.requester_id = u.id AND sr.requester_name IS NULL;

UPDATE service_requests sr
SET property_name = COALESCE(sr.property_name, p.name)
FROM properties p
WHERE sr.property_id = p.id AND sr.property_name IS NULL;

-- FK fixes so deletes succeed without wiping tasks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'service_requests_property_id_fkey' AND table_name = 'service_requests'
  ) THEN
    ALTER TABLE service_requests DROP CONSTRAINT service_requests_property_id_fkey;
  END IF;
END $$;

ALTER TABLE service_requests
  ADD CONSTRAINT service_requests_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_property_id_fkey' AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT projects_property_id_fkey;
  END IF;
END $$;

ALTER TABLE projects
  ADD CONSTRAINT projects_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_vehicle_id_fkey' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks DROP CONSTRAINT tasks_vehicle_id_fkey;
  END IF;
END $$;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_property_id_fkey' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks DROP CONSTRAINT tasks_property_id_fkey;
  END IF;
END $$;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;
