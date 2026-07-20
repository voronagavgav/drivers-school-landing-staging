import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/auth";
import { getAnonUser } from "@/lib/server/anon-session";
import { isValueFirstFunnelEnabled } from "@/lib/funnel";
import { getSessionState } from "@/lib/server/test-engine";
import { TestRunner } from "@/components/test-runner";
import { SaveProgressPrompt } from "@/components/save-progress-prompt";
import { DEFAULT_EXAM_QUESTION_COUNT, MODE_LABEL, type TestMode } from "@/lib/constants";

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // READ-ONLY, flag-aware identity (spec wave18 T2): a real logged-in user wins; else — WHEN the
  // value-first funnel is on — the read-only anon-play user (getAnonUser NEVER mints and NEVER sets a
  // cookie, so a cookieless anon direct-navigating here can't trigger cookies().set() during a GET
  // render → no 500, no orphan anon row); else the old requireUser()/login redirect (byte-identical
  // flag-off). Minting stays in the "use server" actions (startTestAction / segment), which run BEFORE
  // their redirect. A null anon (no valid cookie) falls through to requireUser() → /login — the page
  // never renders with a null user. A minted anon can never own a URL-typed session id, so the
  // getSessionState(id, user.id) → notFound() on a non-owned id is preserved (no IDOR).
  const user =
    (await getCurrentUser()) ??
    (isValueFirstFunnelEnabled() ? await getAnonUser() : null) ??
    (await requireUser());
  const state = await getSessionState(id, user.id);
  if (!state) notFound();
  if (state.status === "COMPLETED") redirect(`/test/${id}/result`);

  const deadlineMs = state.timeLimitSeconds
    ? new Date(state.startedAt).getTime() + state.timeLimitSeconds * 1000
    : null;

  const questions = state.questions.map((q) => ({
    questionId: q.questionId,
    text: q.text,
    imageUrl: q.imageUrl,
    imageKey: q.imageKey,
    topicTitle: q.topicTitle,
    isDemo: q.isDemo,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
    answered: q.answered,
    selectedOptionId: q.selectedOptionId,
    saved: q.saved,
  }));

  // Up-front notice when an exam simulation runs short of the configured count
  // (small published pool). Informational only — the exam still runs (see lib/test-engine).
  const isExamShort =
    state.mode === "EXAM_SIMULATION" && questions.length < DEFAULT_EXAM_QUESTION_COUNT;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-xl font-semibold text-ink">
        {MODE_LABEL[state.mode as TestMode] ?? "Тест"}
        {state.categoryTitle ? <span className="text-muted"> · {state.categoryTitle}</span> : null}
      </h1>
      {isExamShort && (
        <div role="note" className="mb-4 rounded-xl border border-amber bg-amber/10 p-4 text-sm text-ink">
          <p className="font-display font-semibold">Скорочена екзаменаційна симуляція</p>
          <p className="mt-1 text-muted">
            У цій симуляції лише {questions.length}{" "}
            {questions.length === 1 ? "питання" : "питань"} — це менше, ніж у повному екзамені
            ({DEFAULT_EXAM_QUESTION_COUNT}). Доступний пул питань поки що неповний, тому тест буде
            коротшим за звичайний.
          </p>
        </div>
      )}
      <TestRunner sessionId={id} mode={state.mode} questions={questions} deadlineMs={deadlineMs} />
      {isValueFirstFunnelEnabled() && (
        // Non-blocking invitation — sits BELOW the runner, never intercepts the answer/continue
        // controls. The component itself stays hidden for a real (non-anon) user and until the anon
        // visitor has answered ≥ ANON_SAVE_PROMPT_THRESHOLD questions (progressCount).
        <div className="mt-6">
          <SaveProgressPrompt
            isAnonymous={user.isAnonymous}
            progressCount={questions.filter((q) => q.answered).length}
          />
        </div>
      )}
    </div>
  );
}
