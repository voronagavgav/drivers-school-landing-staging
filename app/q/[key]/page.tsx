import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getPublicQuestion } from "@/lib/server/public-question";
import { resolveImageSrc, imageSrcSet } from "@/lib/image-resolve";
import { indexingEnabled, publicOrigin, questionJsonLd } from "@/lib/seo";
import { Wordmark, LegalDisclaimer } from "@/components/brand";
import { SvitlykSprite } from "@/components/svitlyk";
import { cx } from "@/components/ui";

// Public, server-rendered question page (spec T5, wave16-13). Lives OUTSIDE the `(app)` group, so it
// has NO auth guard and NO shell — a logged-out visitor (or a crawler) sees the question, its options
// and image; the correct answer + study-aid explanation are revealed ONLY after the visitor picks an
// option. The reveal is pure progressive enhancement: each option is a plain `<a href="?v=n">`, so the
// page re-renders on the server with the picked value — no client component, no server action, and the
// correctness data physically never reaches the initial (`?v`-less) response (no-leak, Goal 3).
//
// SvitlykSprite is mounted locally: routes outside `(app)` don't inherit the shell sprite, so the
// Wordmark's `<use href="#svitlyk">` would render empty without it (house lesson, wave13-02).

/** A valid `?v` is a digit string (a non-negative integer); we further require it to match a real
 * option's displayOrder. The digit-regex guard matters: bare `z.coerce.number()` turns `?v=` (empty
 * string) into 0 and would spuriously reveal option 0. */
const REVEAL_SCHEMA = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(0));

/**
 * SEO gate (spec T5, wave16-14). Gate 0 ships CLOSED (`APP_ORIGIN` unset) → `indexingEnabled()` is
 * false and every public question emits `<meta name="robots" content="noindex">`, so the default
 * build is fully de-indexed. When Gate 0 opens (a public origin is configured), the noindex is
 * dropped and a canonical URL is advertised from `publicOrigin()`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  if (!indexingEnabled()) {
    return { robots: { index: false, follow: false } };
  }
  const { key } = await params;
  return { alternates: { canonical: `${publicOrigin()}/q/${key}` } };
}

export default async function PublicQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  const { key } = await params;
  const question = await getPublicQuestion(key);
  if (!question) notFound();

  const { v } = await searchParams;
  const rawV = Array.isArray(v) ? v[0] : v;
  const parsedV = REVEAL_SCHEMA.safeParse(rawV);
  // Reveal only when `?v` names an actual option's displayOrder — garbage falls back to the
  // unrevealed state (never crashes, never leaks).
  const pickedOption = parsedV.success
    ? question.options.find((o) => o.displayOrder === parsedV.data) ?? null
    : null;
  const revealed = pickedOption !== null;

  const imageSrc = resolveImageSrc({ imageKey: question.imageKey, imageUrl: question.imageUrl });
  const srcSet = question.imageKey ? imageSrcSet(question.imageKey) : null;

  const explanationText =
    question.explanation?.detailedText?.trim() || question.explanation?.shortText?.trim() || null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8">
      <SvitlykSprite />

      {/*
        schema.org Quiz JSON-LD (spec T5). `revealed` gates the correct answer: the initial (`?v`-less)
        document carries `suggestedAnswer` only — NO `acceptedAnswer` key anywhere — so the correctness
        data never reaches view-source (wave16-13 no-leak contract). Built by the pure lib/seo helper.
      */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- serialised JSON-LD, no user-controlled HTML
        dangerouslySetInnerHTML={{ __html: JSON.stringify(questionJsonLd(question, revealed)) }}
      />

      <header className="mb-6">
        <Wordmark />
      </header>

      <article className="solid p-5 sm:p-6">
        <h1 className="font-display text-lg font-semibold text-ink sm:text-xl">{question.text}</h1>

        {imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element -- resolver route serves negotiated bytes
          <img
            src={imageSrc}
            srcSet={srcSet ?? undefined}
            sizes="(max-width: 712px) calc(100vw - 80px), 632px"
            width={720}
            height={405}
            alt="Ілюстрація до питання"
            className="mt-4 h-auto w-full rounded-chip border border-line"
          />
        )}

        <div className="mt-5 space-y-2">
          {question.options.map((o) => {
            // Non-colour markers pair every colour state with an icon + label (a11y taste law).
            let mark: "correct" | "wrong" | null = null;
            if (revealed) {
              if (o.isCorrect) mark = "correct";
              else if (pickedOption && o.id === pickedOption.id) mark = "wrong";
            }
            const isPicked = pickedOption?.id === o.id;
            return (
              <Link
                key={o.id}
                href={`?v=${o.displayOrder}`}
                aria-current={isPicked ? "true" : undefined}
                className={cx(
                  "opt text-sm",
                  mark === "correct" && "correct",
                  mark === "wrong" && "wrong",
                  isPicked && !revealed && "ring-2 ring-green-deep",
                )}
              >
                <span className="flex-1">{o.text}</span>
                {mark && (
                  <span className="mark font-display text-base font-bold leading-none">
                    <span aria-hidden>{mark === "correct" ? "✓" : "✗"}</span>
                    <span className="sr-only">
                      {mark === "correct" ? "правильна відповідь" : "неправильна відповідь"}
                    </span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {revealed && (
          <section className="mt-5 rounded-chip border border-line bg-field p-4">
            <h2 className="font-display text-base font-semibold text-green-deep">Правильна відповідь</h2>
            {explanationText && (
              <p className="mt-2 text-sm leading-relaxed text-ink">{explanationText}</p>
            )}
            {question.explanation?.legalReference && (
              <p className="mt-2 text-xs text-muted">{question.explanation.legalReference}</p>
            )}
          </section>
        )}

        {!revealed && (
          <p className="mt-5 text-sm text-muted">Оберіть відповідь, щоб побачити правильну.</p>
        )}
      </article>

      <footer className="mt-8">
        <LegalDisclaimer />
      </footer>
    </div>
  );
}
