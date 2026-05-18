-- Fleet query performance indexes

CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_vehicle_status
  ON vehicle_reservations(vehicle_id, status);

CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_user
  ON vehicle_reservations(user_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_check_out_logs_reservation
  ON vehicle_check_out_logs(reservation_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_check_in_logs_checkout
  ON vehicle_check_in_logs(check_out_log_id);
