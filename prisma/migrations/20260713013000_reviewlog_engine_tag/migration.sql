-- Additive: grade-engine version tag for future weight-fit segmentation. Nullable, no default —
-- pre-existing rows stay NULL (pre-tag semantics), new rows carry REVIEW_ENGINE_VERSION.
ALTER TABLE "ReviewLog" ADD COLUMN "engine" TEXT;
