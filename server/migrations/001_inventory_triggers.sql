-- Migration: Add database triggers for automatic inventory management
-- This ensures inventory quantities are automatically updated when parts are used on tasks
-- Skips entirely if parts_used does not exist yet (e.g. schema not fully applied).

DO $migration$
BEGIN
  IF to_regclass('public.parts_used') IS NOT NULL THEN
  -- Create function to update inventory when parts are used
  CREATE OR REPLACE FUNCTION update_inventory_on_parts_used()
  RETURNS TRIGGER AS $func$
  BEGIN
    -- On INSERT: Reduce inventory quantity
    IF (TG_OP = 'INSERT') THEN
      IF NEW.inventory_item_id IS NOT NULL THEN
        UPDATE inventory_items
        SET quantity = quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;

        -- Check if quantity went negative
        IF (SELECT quantity FROM inventory_items WHERE id = NEW.inventory_item_id) < 0 THEN
          RAISE EXCEPTION 'Insufficient inventory: Cannot use % units when stock is insufficient', NEW.quantity;
        END IF;
      END IF;
      RETURN NEW;

    -- On DELETE: Restore inventory quantity
    ELSIF (TG_OP = 'DELETE') THEN
      IF OLD.inventory_item_id IS NOT NULL THEN
        UPDATE inventory_items
        SET quantity = quantity + OLD.quantity,
            updated_at = NOW()
        WHERE id = OLD.inventory_item_id;
      END IF;
      RETURN OLD;

    -- On UPDATE: Adjust inventory based on quantity change
    ELSIF (TG_OP = 'UPDATE') THEN
      IF OLD.inventory_item_id IS NOT NULL AND NEW.inventory_item_id IS NOT NULL THEN
        -- If item ID changed, restore old and deduct from new
        IF OLD.inventory_item_id <> NEW.inventory_item_id THEN
          UPDATE inventory_items
          SET quantity = quantity + OLD.quantity,
              updated_at = NOW()
          WHERE id = OLD.inventory_item_id;

          UPDATE inventory_items
          SET quantity = quantity - NEW.quantity,
              updated_at = NOW()
          WHERE id = NEW.inventory_item_id;
        ELSE
          -- Same item, just quantity changed
          UPDATE inventory_items
          SET quantity = quantity + (OLD.quantity - NEW.quantity),
              updated_at = NOW()
          WHERE id = NEW.inventory_item_id;
        END IF;

        -- Check if quantity went negative
        IF (SELECT quantity FROM inventory_items WHERE id = NEW.inventory_item_id) < 0 THEN
          RAISE EXCEPTION 'Insufficient inventory after update';
        END IF;
      END IF;
      RETURN NEW;
    END IF;
  END;
  $func$ LANGUAGE plpgsql;

  -- Drop trigger if it exists
  DROP TRIGGER IF EXISTS parts_used_inventory_trigger ON parts_used;

  -- Create trigger to automatically update inventory when parts are used
  CREATE TRIGGER parts_used_inventory_trigger
  AFTER INSERT OR UPDATE OR DELETE ON parts_used
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_parts_used();

  -- Add CHECK constraint to prevent negative inventory
  ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_quantity_non_negative;

  ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_quantity_non_negative CHECK (quantity >= 0);
  END IF;
END;
$migration$;
