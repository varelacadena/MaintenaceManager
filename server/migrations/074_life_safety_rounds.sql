-- Weekly life-safety rounds: one task per property, with a row for each detector and exit sign.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS life_safety_round boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS life_safety_checks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id varchar NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  equipment_id varchar REFERENCES equipment(id) ON DELETE SET NULL,
  equipment_name varchar(200) NOT NULL,
  asset_tag varchar(100),
  category varchar(50) NOT NULL,
  space_name varchar(200),
  floor varchar(50),
  sort_order integer NOT NULL DEFAULT 0,
  result varchar(20) NOT NULL DEFAULT 'pending',
  problem_note text,
  checked_by_id varchar REFERENCES users(id) ON DELETE SET NULL,
  checked_by_name varchar(200),
  checked_at timestamp,
  repair_task_id varchar,
  created_at timestamp DEFAULT now(),
  CONSTRAINT life_safety_checks_result_check CHECK (result IN ('pending', 'pass', 'problem'))
);

CREATE INDEX IF NOT EXISTS life_safety_checks_task_id_idx ON life_safety_checks(task_id);
CREATE INDEX IF NOT EXISTS tasks_life_safety_property_idx ON tasks(property_id) WHERE life_safety_round = true;
