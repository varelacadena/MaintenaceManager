
-- Add property_id column to service_requests with correct uuid type (only if it doesn't exist)
DO $$ 
BEGIN
    -- Check if column exists before adding it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_requests' 
        AND column_name = 'property_id'
    ) THEN
        ALTER TABLE service_requests ADD COLUMN property_id uuid;
    END IF;

    -- Check if foreign key constraint exists before adding it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'service_requests_property_id_fkey'
        AND table_name = 'service_requests'
    ) THEN
        ALTER TABLE service_requests
        ADD CONSTRAINT service_requests_property_id_fkey 
        FOREIGN KEY (property_id) REFERENCES properties(id);
    END IF;
END $$;
