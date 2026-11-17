-- A refund belongs to one receipt. The receipt amount stays the same.

CREATE TABLE IF NOT EXISTS purchase_refunds (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id varchar NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  amount double precision NOT NULL CHECK (amount > 0),
  refunded_on date NOT NULL,
  note text,
  created_by_id varchar REFERENCES users(id) ON DELETE SET NULL,
  created_by_name varchar(200),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_refunds_purchase_id_idx ON purchase_refunds(purchase_id);
CREATE INDEX IF NOT EXISTS purchase_refunds_refunded_on_idx ON purchase_refunds(refunded_on);
