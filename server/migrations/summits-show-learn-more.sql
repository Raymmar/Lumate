-- Additive only. Keep existing summit content and current button visibility.
ALTER TABLE summits
  ADD COLUMN IF NOT EXISTS show_learn_more boolean NOT NULL DEFAULT true;
