BEGIN;

-- Keep the legacy ledger available so an older deployment can still recognize these migrations.
CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY);

INSERT INTO schema_migrations (name) VALUES
  ('001-pilot.sql'), ('002-aid-allocations.sql'), ('003-pilot-corrections.sql')
ON CONFLICT (name) DO NOTHING;

COMMIT;
