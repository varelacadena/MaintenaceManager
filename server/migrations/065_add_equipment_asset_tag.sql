-- Short human-readable asset tags for fixed equipment (QR labels, field traceability)

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS asset_tag VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS equipment_asset_tag_unique
  ON equipment (asset_tag)
  WHERE asset_tag IS NOT NULL AND TRIM(asset_tag) <> '';

CREATE INDEX IF NOT EXISTS idx_equipment_asset_tag ON equipment (asset_tag);

-- Backfill existing rows with structured tags: PROP-SPACE-CAT-NN
WITH numbered AS (
  SELECT
    e.id,
    UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(p.name, 'PROP'), '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 4)) AS prop_abbr,
    UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(s.name, 'GEN'), '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 4)) AS space_abbr,
    UPPER(SUBSTRING(e.category FROM 1 FOR 4)) AS cat_abbr,
    ROW_NUMBER() OVER (
      PARTITION BY e.property_id, COALESCE(e.space_id, ''), e.category
      ORDER BY e.created_at
    ) AS seq
  FROM equipment e
  JOIN properties p ON p.id = e.property_id
  LEFT JOIN spaces s ON s.id = e.space_id
)
UPDATE equipment e
SET asset_tag = n.prop_abbr || '-' || n.space_abbr || '-' || n.cat_abbr || '-' || LPAD(n.seq::text, 2, '0')
FROM numbered n
WHERE e.id = n.id
  AND (e.asset_tag IS NULL OR TRIM(e.asset_tag) = '');
