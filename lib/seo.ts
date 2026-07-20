// Pure SEO helpers (spec T5, wave16-14): the indexing GATE and the schema.org JSON-LD builder for
// the public `/q/[key]` page. No `server-only`, no DB, no React — so the JSON-LD shape is unit-testable
// without rendering RSC, and the page (`app/q/[key]/page.tsx`) and `app/sitemap.ts` import from here.
//
// GATE 0 ships CLOSED: `APP_ORIGIN` is unset by default, so `indexingEnabled()` is false and the app
// serves a fully de-indexed default (noindex meta + no `/q/` sitemap entries). Reads are CALL-TIME
// (never cached at module load) so a test can flip the env with `vi.stubEnv` between assertions.

/** The public canonical origin (trimmed `APP_ORIGIN`), or `null` when unset/blank — read at call time. */
export function publicOrigin(): string | null {
  const raw = process.env.APP_ORIGIN?.trim();
  return raw ? raw : null;
}

/** Indexing is enabled only when a public origin is configured (Gate 0). */
export function indexingEnabled(): boolean {
  return publicOrigin() !== null;
}

/** Minimal question shape the JSON-LD builder needs — `PublicQuestion` is structurally assignable. */
export interface SeoQuestionOption {
  text: string;
  isCorrect: boolean;
}
export interface SeoQuestion {
  text: string;
  options: SeoQuestionOption[];
}

/**
 * Build the schema.org `Quiz` JSON-LD for a public question. `suggestedAnswer` lists ALL options (so
 * the correct one is NOT distinguishable in the markup), and `acceptedAnswer` — carrying the correct
 * option text — is added ONLY when `revealed` is true. The un-revealed document therefore has NO
 * `acceptedAnswer` key anywhere, preserving wave16-13's no-leak contract (spec T5).
 */
export function questionJsonLd(q: SeoQuestion, revealed: boolean): Record<string, unknown> {
  const question: Record<string, unknown> = {
    "@type": "Question",
    text: q.text,
    suggestedAnswer: q.options.map((o) => ({ "@type": "Answer", text: o.text })),
  };

  if (revealed) {
    const correct = q.options.find((o) => o.isCorrect);
    if (correct) {
      question.acceptedAnswer = { "@type": "Answer", text: correct.text };
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "Quiz",
    hasPart: [question],
  };
}
