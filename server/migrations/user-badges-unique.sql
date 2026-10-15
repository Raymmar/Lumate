-- Development only: remove the unpublished uniqueness requirement so Publish
-- does not try to enforce it against historical production duplicates.
-- Preserve every existing assignment, including its attribution and timestamp.
-- BadgeService serializes new awards using transaction-scoped advisory locks.
DROP INDEX IF EXISTS user_badges_user_badge_unique;
