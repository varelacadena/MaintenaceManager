
-- Migration: Add vehicle-related columns to uploads table
-- This adds support for attaching uploads to vehicles and check-in/out logs

-- Add check_out_log_id column
ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS check_out_log_id varchar REFERENCES vehicle_check_out_logs(id) ON DELETE CASCADE;

-- Add check_in_log_id column
ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS check_in_log_id varchar REFERENCES vehicle_check_in_logs(id) ON DELETE CASCADE;

-- Add vehicle_id column
ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS vehicle_id varchar REFERENCES vehicles(id) ON DELETE CASCADE;
