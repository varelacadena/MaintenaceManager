-- Add simple sequential display numbers for service requests and fleet reservations.

CREATE SEQUENCE IF NOT EXISTS service_request_number_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS vehicle_reservation_number_seq START WITH 1;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS request_number INTEGER;

ALTER TABLE vehicle_reservations
  ADD COLUMN IF NOT EXISTS reservation_number INTEGER;

WITH numbered_requests AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at NULLS LAST, id) AS seq
  FROM service_requests
  WHERE request_number IS NULL
)
UPDATE service_requests sr
SET request_number = numbered_requests.seq
FROM numbered_requests
WHERE sr.id = numbered_requests.id;

WITH numbered_reservations AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at NULLS LAST, id) AS seq
  FROM vehicle_reservations
  WHERE reservation_number IS NULL
)
UPDATE vehicle_reservations vr
SET reservation_number = numbered_reservations.seq
FROM numbered_reservations
WHERE vr.id = numbered_reservations.id;

SELECT setval(
  'service_request_number_seq',
  GREATEST((SELECT COALESCE(MAX(request_number), 0) FROM service_requests), 1),
  (SELECT COALESCE(MAX(request_number), 0) > 0 FROM service_requests)
);

SELECT setval(
  'vehicle_reservation_number_seq',
  GREATEST((SELECT COALESCE(MAX(reservation_number), 0) FROM vehicle_reservations), 1),
  (SELECT COALESCE(MAX(reservation_number), 0) > 0 FROM vehicle_reservations)
);

ALTER TABLE service_requests
  ALTER COLUMN request_number SET DEFAULT nextval('service_request_number_seq'),
  ALTER COLUMN request_number SET NOT NULL;

ALTER TABLE vehicle_reservations
  ALTER COLUMN reservation_number SET DEFAULT nextval('vehicle_reservation_number_seq'),
  ALTER COLUMN reservation_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_requests_request_number
  ON service_requests(request_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_reservations_reservation_number
  ON vehicle_reservations(reservation_number);

