import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isValueFirstFunnelEnabled } from "@/lib/funnel";
import { SEGMENT_EXAM_TIMINGS, SEGMENT_CONFIDENCE } from "@/lib/segment";
import {
  segmentSelectCategoryAction,
  segmentAnswerTimingAction,
  segmentAnswerConfidenceAction,
} from "@/app/actions/segment";
import { Card } from "@/components/ui";
import { LegalDisclaimer } from "@/components/brand";

// ---------------------------------------------------------------------------
// Value-first self-segment surface (Wave 17, T2/P1.4). A TOP-LEVEL route OUTSIDE the
// auth `(app)` group — an anon visitor reaches it without login when VALUE_FIRST_FUNNEL
// is on (identity is minted lazily by the tap actions, not on GET). Flag-off → the page
// bounces anon to /login (Goal §7), leaving today's authed onboarding untouched.
//
// ≤4-TAP BUDGET: category (tap 1) → exam timing (tap 2) → confidence (tap 3) → the tap
// itself opens a real `/test/<id>` loop. Every choice is a single-select SUBMIT chip —
// ZERO free-text inputs, NO email/password. Steps 2–3 carry a «Пропустити» skip that
// still lands a real question set (freemium inversion — the skip never dead-ends).
// ---------------------------------------------------------------------------

const CHIP =
  "flex w-full items-center justify-center rounded-xl border border-line bg-card px-4 py-4 text-center font-display text-base font-semibold text-ink outline-none transition-colors hover:border-green-deep focus-visible:border-green-deep focus-visible:ring-2 focus-visible:ring-green-deep motion-reduce:transition-none";

const SKIP = "text-sm font-medium text-muted underline";

function Eyebrow({ step }: { step: number }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Крок {step} з 3</p>
  );
}

export default async function SegmentPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  // Identity is minted lazily by the tap actions — the GET only gates reachability.
  const real = await getCurrentUser();
  if (!real && !isValueFirstFunnelEnabled()) redirect("/login");

  const raw = (await searchParams).step;
  const step = raw === "timing" || raw === "confidence" ? raw : "category";

  if (step === "timing") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <Eyebrow step={2} />
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Коли плануєш іспит?</h1>
        <p className="mt-1 text-sm text-muted">Підберемо спокійний темп. Можна пропустити.</p>
        <form action={segmentAnswerTimingAction} className="mt-5 space-y-3">
          {SEGMENT_EXAM_TIMINGS.map((t) => (
            <button key={t.value} type="submit" name="timing" value={t.value} className={CHIP}>
              {t.label}
            </button>
          ))}
        </form>
        <div className="mt-4">
          <Link href="/segment?step=confidence" className={SKIP}>
            Пропустити
          </Link>
        </div>
      </div>
    );
  }

  if (step === "confidence") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <Eyebrow step={3} />
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
          Наскільки впевнено почуваєшся?
        </h1>
        <p className="mt-1 text-sm text-muted">Останній крок — далі одразу почнемо.</p>
        {/* Both the chips AND the skip submit this form: a chip records confidence, the skip
            (no `confidence` value) records nothing — but BOTH open the tailored set. */}
        <form action={segmentAnswerConfidenceAction} className="mt-5 space-y-3">
          {SEGMENT_CONFIDENCE.map((c) => (
            <button key={c.value} type="submit" name="confidence" value={c.value} className={CHIP}>
              {c.label}
            </button>
          ))}
          <div className="pt-1">
            <button type="submit" className={SKIP}>
              Пропустити
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 1 (default): category — required, all TAP chips. Category B (легкові) leads.
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
  const ordered = [
    ...categories.filter((c) => c.code === "B"),
    ...categories.filter((c) => c.code !== "B"),
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Eyebrow step={1} />
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Яка категорія прав?</h1>
      <p className="mt-1 text-sm text-muted">Одразу підберемо питання під неї.</p>
      <form action={segmentSelectCategoryAction} className="mt-5 space-y-3">
        {ordered.map((c) => (
          <button key={c.id} type="submit" name="categoryId" value={c.id} className={CHIP}>
            {c.title}
          </button>
        ))}
      </form>
      <Card className="mt-6">
        <LegalDisclaimer />
      </Card>
    </div>
  );
}
