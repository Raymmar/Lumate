-- Development/post-merge only. Publish applies this additive schema to production.
-- Catalog rows are initialized by the application's data-only startup step.
CREATE TABLE IF NOT EXISTS sponsor_tiers (
  key varchar(50) PRIMARY KEY,
  name varchar(80) NOT NULL,
  description text,
  position integer NOT NULL,
  presentation varchar(20) NOT NULL,
  is_default boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS sponsor_tiers_single_default_idx
  ON sponsor_tiers (is_default) WHERE is_default = true;
