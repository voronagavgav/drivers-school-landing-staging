// ---------------------------------------------------------------------------
// PURE session-secret resolver. No I/O, no database client, no server-runtime-
// only modules, and it does NOT read the global environment itself — the env is
// passed in as the argument — so it stays runtime-agnostic and unit-testable.
// ---------------------------------------------------------------------------

/** The dev-only fallback used when no secret is configured outside production. */
export const DEV_FALLBACK_SECRET = "dev-only-insecure-secret";

type SecretEnv = {
  SESSION_SECRET?: string;
  NODE_ENV?: string;
};

/**
 * Resolves the HMAC signing secret from an env-like object.
 * - A non-empty `SESSION_SECRET` is returned as-is.
 * - Otherwise, in production a missing secret is a hard error (forgeable
 *   cookies), so this THROWS naming `SESSION_SECRET`.
 * - Otherwise (dev/test) it returns the insecure dev fallback.
 */
export function resolveSessionSecret(env: SecretEnv): string {
  const configured = env.SESSION_SECRET;
  if (typeof configured === "string" && configured !== "") return configured;
  if (env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set in production — refusing to fall back to the insecure dev secret.",
    );
  }
  return DEV_FALLBACK_SECRET;
}
