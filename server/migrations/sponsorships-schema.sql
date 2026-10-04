-- One sponsor record per sponsor plus a yearly sponsorship history.
-- The legacy sponsors.year / sponsors.tier columns become nullable but are kept
-- until the data step has copied them into sponsorships in production.
BEGIN;
ALTER TABLE sponsors ALTER COLUMN year DROP NOT NULL;
ALTER TABLE sponsors ALTER COLUMN tier DROP NOT NULL;
CREATE TABLE IF NOT EXISTS sponsorships (
  id serial PRIMARY KEY,
  sponsor_id integer NOT NULL REFERENCES sponsors(id),
  year integer NOT NULL,
  tier varchar(50) NOT NULL,
  deleted_at timestamptz,
  deleted_by integer REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sponsorships_active_sponsor_year_idx ON sponsorships (sponsor_id, year) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS sponsorships_active_year_idx ON sponsorships (year) WHERE deleted_at IS NULL;
COMMIT;
