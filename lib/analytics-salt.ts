// ---------------------------------------------------------------------------
// PURE analytics-salt resolver. No I/O, no database client, no server-runtime-
// only modules, and it does NOT read the global environment itself — the env is
// passed in as the argument — so it stays runtime-agnostic and unit-testable.
//
// The salt is the secret that makes ip pseudonymisation (lib/analytics-ingest.ts
// hashIp) non-reversible and rotatable. It is independent of SESSION_SECRET so
// rotating one does not invalidate the other.
// ---------------------------------------------------------------------------

/** Dev-only fallback used when no analytics salt is configured outside production. */
export const DEV_FALLBACK_ANALYTICS_SALT = "dev-only-insecure-analytics-salt";

type SaltEnv = {
  ANALYTICS_SALT?: string;
  SESSION_SECRET?: string;
  NODE_ENV?: string;
};

/**
 * Resolves the ip-hashing salt from an env-like object.
 * - A non-empty `ANALYTICS_SALT` is returned as-is (preferred, independently rotatable).
 * - Otherwise, in production we fall back to deriving from `SESSION_SECRET` (already required in
 *   prod) so a deploy that forgets ANALYTICS_SALT still pseudonymises with a real secret rather
 *   than a public dev constant. The derived salt is namespaced so it never equals SESSION_SECRET.
 * - Otherwise (dev/test) it returns the insecure dev fallback.
 */
export function resolveAnalyticsSalt(env: SaltEnv): string {
  const configured = env.ANALYTICS_SALT;
  if (typeof configured === "string" && configured !== "") return configured;
  if (env.NODE_ENV === "production") {
    const session = env.SESSION_SECRET;
    if (typeof session === "string" && session !== "") return `analytics:${session}`;
    throw new Error(
      "ANALYTICS_SALT (or SESSION_SECRET) must be set in production — refusing to hash IPs with the insecure dev salt.",
    );
  }
  return DEV_FALLBACK_ANALYTICS_SALT;
}
