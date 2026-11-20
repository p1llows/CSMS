-- Map legacy event types into the new allowed set: 'Events' and 'FRC'
-- 1) Drop existing CHECK constraint FIRST (name may vary)
DO $$
DECLARE
  cons_name text;
BEGIN
  -- Attempt to drop known name if present
  BEGIN
    EXECUTE 'ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check';
  EXCEPTION WHEN others THEN
    -- ignore and fallback to lookup
  END;

  -- Lookup any remaining CHECK constraint referencing column `type`
  SELECT con.conname INTO cons_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = con.connamespace
  WHERE rel.relname = 'events'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%type%';

  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE events DROP CONSTRAINT %I', cons_name);
  END IF;

END $$;

-- 2) Convert 'Flag Raising' to 'FRC'
UPDATE events SET type = 'FRC' WHERE type ILIKE 'Flag Raising';

-- 3) Convert everything else to 'Events'
UPDATE events SET type = 'Events' WHERE type NOT IN ('Events', 'FRC');

-- 4) Add new CHECK constraint allowing only 'Events' and 'FRC'
ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (type IN ('Events', 'FRC'));
