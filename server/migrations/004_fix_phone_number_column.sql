
-- Fix the phone_number column name typo (only if the typo exists)
DO $$ 
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check if the column with double underscores exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'phone__number'
    ) INTO col_exists;
    
    -- Only rename if the typo column exists
    IF col_exists THEN
        EXECUTE 'ALTER TABLE users RENAME COLUMN phone__number TO phone_number';
    END IF;
END $$;
