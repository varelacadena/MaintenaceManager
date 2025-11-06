
-- Fix property column names to use snake_case consistently
-- This migration handles the rename regardless of current state

DO $$ 
BEGIN
    -- First, check if we need to rename imageUrl to image_url
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'imageUrl'
    ) THEN
        ALTER TABLE properties RENAME COLUMN "imageUrl" TO image_url;
    END IF;

    -- Check if we need to rename lastWorkDate to last_work_date
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'lastWorkDate'
    ) THEN
        ALTER TABLE properties RENAME COLUMN "lastWorkDate" TO last_work_date;
    END IF;

    -- Check and rename equipment columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment' 
        AND column_name = 'propertyId'
    ) THEN
        ALTER TABLE equipment RENAME COLUMN "propertyId" TO property_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment' 
        AND column_name = 'serialNumber'
    ) THEN
        ALTER TABLE equipment RENAME COLUMN "serialNumber" TO serial_number;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment' 
        AND column_name = 'imageUrl'
    ) THEN
        ALTER TABLE equipment RENAME COLUMN "imageUrl" TO image_url;
    END IF;

    -- Fix tasks table propertyId column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'propertyId'
    ) THEN
        ALTER TABLE tasks RENAME COLUMN "propertyId" TO property_id;
    END IF;
END $$;
