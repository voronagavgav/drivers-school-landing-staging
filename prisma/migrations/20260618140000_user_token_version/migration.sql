-- Per-user session token version. Bumped on password change so all OLD stateless session
-- cookies (which embed the tokenVersion they were minted at) become invalid. Additive,
-- data-preserving ALTER: existing users default to 0 (matching the cookie payload default).
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
