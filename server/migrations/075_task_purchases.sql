-- Store runs: a purchase made for one task, with the receipt kept on that task.

CREATE TABLE IF NOT EXISTS task_purchases (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id varchar NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  store_name varchar(200) NOT NULL,
  description text NOT NULL,
  amount double precision NOT NULL,
  purchased_on date NOT NULL,
  receipt_file_name varchar(500),
  receipt_file_type varchar(100),
  receipt_object_path varchar(1000),
  created_by_id varchar REFERENCES users(id) ON DELETE SET NULL,
  created_by_name varchar(200),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_purchases_task_id_idx ON task_purchases(task_id);
CREATE INDEX IF NOT EXISTS task_purchases_purchased_on_idx ON task_purchases(purchased_on);
