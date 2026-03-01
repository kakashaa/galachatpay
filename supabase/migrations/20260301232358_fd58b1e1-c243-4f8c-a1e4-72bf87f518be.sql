
-- Remove the old unique constraint that only allows one request per user
-- New rules: Level 50+ gets 2 requests/month, Level 40+ gets 1 request/month
-- The monthly limit is now enforced in application code
DROP INDEX IF EXISTS idx_animated_photo_one_per_user;
