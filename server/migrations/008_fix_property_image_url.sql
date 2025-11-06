
-- Fix the column name from imageUrl to image_url to match database naming convention
ALTER TABLE properties RENAME COLUMN "imageUrl" TO image_url;
