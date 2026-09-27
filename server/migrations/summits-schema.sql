BEGIN;
CREATE TABLE IF NOT EXISTS summits (
  id serial PRIMARY KEY,
  year integer NOT NULL UNIQUE,
  title varchar(255) NOT NULL,
  tagline varchar(255),
  description text,
  start_date varchar(10),
  end_date varchar(10),
  date_label varchar(255),
  venue_name varchar(255),
  venue_address varchar(500),
  venue_map_url varchar(500),
  ticket_url varchar(500),
  photos_url varchar(500),
  video_embed_url varchar(500),
  hero_image varchar(500),
  logo_image varchar(500),
  date_block_image varchar(500),
  seo_image varchar(500),
  presented_by_name varchar(255),
  presented_by_url varchar(500),
  gallery_images json NOT NULL DEFAULT '[]'::json,
  highlights json NOT NULL DEFAULT '[]'::json,
  links json NOT NULL DEFAULT '[]'::json,
  is_published boolean NOT NULL DEFAULT false,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS summits_single_current_idx ON summits (is_current) WHERE is_current = true;
ALTER TABLE time_blocks ADD COLUMN IF NOT EXISTS summit_id integer REFERENCES summits(id) ON DELETE SET NULL;
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS summit_id integer REFERENCES summits(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS summit_id integer REFERENCES summits(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS time_blocks_summit_idx ON time_blocks (summit_id);
CREATE INDEX IF NOT EXISTS presentations_summit_idx ON presentations (summit_id);
COMMIT;
