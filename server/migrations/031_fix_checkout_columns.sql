-- Add missing columns to vehicle_check_out_logs to match the schema
-- The database has start_fuel_level but schema expects fuel_level

-- Check if fuel_level column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_check_out_logs' AND column_name = 'fuel_level'
    ) THEN
        -- First try to rename start_fuel_level to fuel_level if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'vehicle_check_out_logs' AND column_name = 'start_fuel_level'
        ) THEN
            ALTER TABLE vehicle_check_out_logs RENAME COLUMN start_fuel_level TO fuel_level;
        ELSE
            ALTER TABLE vehicle_check_out_logs ADD COLUMN fuel_level VARCHAR(20) NOT NULL DEFAULT 'unknown';
        END IF;
    END IF;
END $$;

-- Add cleanliness_confirmed if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_check_out_logs' AND column_name = 'cleanliness_confirmed'
    ) THEN
        ALTER TABLE vehicle_check_out_logs ADD COLUMN cleanliness_confirmed BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add damage_notes if it doesn't exist (rename from inspection_notes if needed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_check_out_logs' AND column_name = 'damage_notes'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'vehicle_check_out_logs' AND column_name = 'inspection_notes'
        ) THEN
            ALTER TABLE vehicle_check_out_logs RENAME COLUMN inspection_notes TO damage_notes;
        ELSE
            ALTER TABLE vehicle_check_out_logs ADD COLUMN damage_notes TEXT;
        END IF;
    END IF;
END $$;

-- Add digital_signature if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_check_out_logs' AND column_name = 'digital_signature'
    ) THEN
        ALTER TABLE vehicle_check_out_logs ADD COLUMN digital_signature TEXT;
    END IF;
END $$;

-- Add admin_override if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_check_out_logs' AND column_name = 'admin_override'
    ) THEN
        ALTER TABLE vehicle_check_out_logs ADD COLUMN admin_override BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add check_out_time if it doesn't exist (rename from check_out_date if needed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_check_out_logs' AND column_name = 'check_out_time'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'vehicle_check_out_logs' AND column_name = 'check_out_date'
        ) THEN
            ALTER TABLE vehicle_check_out_logs RENAME COLUMN check_out_date TO check_out_time;
        ELSE
            ALTER TABLE vehicle_check_out_logs ADD COLUMN check_out_time TIMESTAMP NOT NULL DEFAULT NOW();
        END IF;
    END IF;
END $$;
