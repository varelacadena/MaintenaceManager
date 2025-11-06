
-- Ensure all property-related columns use snake_case naming
-- This is a safety net migration to catch any remaining camelCase columns

DO $$ 
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Properties table fixes
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'imageUrl'
    ) INTO col_exists;
    
    IF col_exists THEN
        EXECUTE 'ALTER TABLE properties RENAME COLUMN "imageUrl" TO image_url';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'lastWorkDate'
    ) INTO col_exists;
    
    IF col_exists THEN
        EXECUTE 'ALTER TABLE properties RENAME COLUMN "lastWorkDate" TO last_work_date';
    END IF;

    -- Equipment table fixes
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment' 
        AND column_name = 'propertyId'
    ) INTO col_exists;
    
    IF col_exists THEN
        EXECUTE 'ALTER TABLE equipment RENAME COLUMN "propertyId" TO property_id';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment' 
        AND column_name = 'serialNumber'
    ) INTO col_exists;
    
    IF col_exists THEN
        EXECUTE 'ALTER TABLE equipment RENAME COLUMN "serialNumber" TO serial_number';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment' 
        AND column_name = 'imageUrl'
    ) INTO col_exists;
    
    IF col_exists THEN
        EXECUTE 'ALTER TABLE equipment RENAME COLUMN "imageUrl" TO image_url';
    END IF;

    -- Tasks table fix
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'propertyId'
    ) INTO col_exists;
    
    IF col_exists THEN
        EXECUTE 'ALTER TABLE tasks RENAME COLUMN "propertyId" TO property_id';
    END IF;
END $$;
