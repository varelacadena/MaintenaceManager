-- Receipts live on their own. A store run on a job is a link to that receipt.
-- Deleting a job removes the link and keeps the receipt.

CREATE TABLE IF NOT EXISTS purchases (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name varchar(200) NOT NULL,
  description text NOT NULL,
  amount double precision NOT NULL,
  purchased_on date NOT NULL,
  receipt_file_name varchar(500),
  receipt_file_type varchar(100),
  receipt_object_path varchar(1000),
  purpose varchar(20),
  purpose_note text,
  created_by_id varchar REFERENCES users(id) ON DELETE SET NULL,
  created_by_name varchar(200),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT purchases_purpose_check CHECK (purpose IS NULL OR purpose IN ('shop_stock', 'general'))
);

CREATE TABLE IF NOT EXISTS purchase_links (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id varchar NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  task_id varchar REFERENCES tasks(id) ON DELETE CASCADE,
  vehicle_id varchar REFERENCES vehicles(id) ON DELETE CASCADE,
  equipment_id varchar REFERENCES equipment(id) ON DELETE CASCADE,
  mobile_equipment_id varchar REFERENCES mobile_equipment(id) ON DELETE CASCADE,
  property_id varchar REFERENCES properties(id) ON DELETE CASCADE,
  project_id varchar REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  CONSTRAINT purchase_links_one_target CHECK (
    (CASE WHEN task_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN vehicle_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN equipment_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN mobile_equipment_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN property_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN project_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

CREATE INDEX IF NOT EXISTS purchases_purchased_on_idx ON purchases(purchased_on);
CREATE INDEX IF NOT EXISTS purchase_links_purchase_id_idx ON purchase_links(purchase_id);
CREATE INDEX IF NOT EXISTS purchase_links_task_id_idx ON purchase_links(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS purchase_links_task_uidx ON purchase_links(purchase_id, task_id) WHERE task_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS purchase_links_vehicle_uidx ON purchase_links(purchase_id, vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS purchase_links_equipment_uidx ON purchase_links(purchase_id, equipment_id) WHERE equipment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS purchase_links_tool_uidx ON purchase_links(purchase_id, mobile_equipment_id) WHERE mobile_equipment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS purchase_links_property_uidx ON purchase_links(purchase_id, property_id) WHERE property_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS purchase_links_project_uidx ON purchase_links(purchase_id, project_id) WHERE project_id IS NOT NULL;

INSERT INTO purchases (
  id, store_name, description, amount, purchased_on,
  receipt_file_name, receipt_file_type, receipt_object_path,
  created_by_id, created_by_name, created_at, updated_at
)
SELECT
  id, store_name, description, amount, purchased_on,
  receipt_file_name, receipt_file_type, receipt_object_path,
  created_by_id, created_by_name, created_at, updated_at
FROM task_purchases
WHERE NOT EXISTS (SELECT 1 FROM purchases p WHERE p.id = task_purchases.id);

INSERT INTO purchase_links (purchase_id, task_id)
SELECT id, task_id
FROM task_purchases
WHERE NOT EXISTS (
  SELECT 1 FROM purchase_links pl
  WHERE pl.purchase_id = task_purchases.id AND pl.task_id = task_purchases.task_id
);

DROP TABLE IF EXISTS task_purchases;
