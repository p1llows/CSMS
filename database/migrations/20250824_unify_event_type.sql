-- Unify all event types to a single value 'Events'
-- 1) Update existing rows
UPDATE events SET type = 'Events' WHERE type <> 'Events';

-- 2) Drop existing CHECK constraint (name may vary); attempt common name first, then dynamic approach
DO $$
DECLARE
  cons_name text;
BEGIN
  -- Try to drop by the commonly generated name
  BEGIN
    EXECUTE 'ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check';
  EXCEPTION WHEN others THEN
    -- ignore
  END;

  -- Find the actual constraint name for CHECK on column `type`
  SELECT con.conname INTO cons_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = con.connamespace
  WHERE rel.relname = 'events' AND con.contype = 'c' AND con.consrc ILIKE '%type%IN%';

  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE events DROP CONSTRAINT %I', cons_name);
  END IF;

  -- Add the new CHECK constraint allowing only 'Events'
  EXECUTE 'ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (type IN (''Events''))';
END $$;
