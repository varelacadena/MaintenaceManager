-- Unique barcodes when set (empty strings treated as null for uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_barcode_unique
  ON inventory_items (barcode)
  WHERE barcode IS NOT NULL AND TRIM(barcode) <> '';
