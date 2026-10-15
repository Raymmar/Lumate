-- Keep the earliest award (including its attribution) when removing duplicates.
-- Block concurrent writers until both cleanup and uniqueness are in place.
BEGIN;
LOCK TABLE user_badges IN SHARE ROW EXCLUSIVE MODE;

DELETE FROM user_badges
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, row_number() OVER (
      PARTITION BY user_id, badge_id ORDER BY assigned_at, id
    ) AS award_number
    FROM user_badges
  ) AS ranked_awards
  WHERE award_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS user_badges_user_badge_unique
  ON user_badges (user_id, badge_id);
COMMIT;
