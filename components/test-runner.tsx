"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import { submitAnswerAction, finishTestAction, toggleSaveAction, setAnswerConfidenceAction, extendSessionAction } from "@/app/actions/test";
import { Button, Badge, DemoBadge, ExplanationNotice, cx } from "@/components/ui";
import { MODE_LABEL, QUICK_SOFT_TIME_SEC, type TestMode } from "@/lib/constants";
import { isConfidenceSampled } from "@/lib/confidence-sampling";
import { imageSrcSet, resolveImageSrc } from "@/lib/image-resolve";
import { digitToOptionIndex, swipeAction, clampResumeIndex } from "@/lib/runner-input";
import { enqueueAnswer, removeQueued } from "@/lib/offline/wal";
import { track } from "@/lib/client/track";

interface RunnerOption {
  id: string;
  text: string;
}
interface RunnerQuestion {
  questionId: string;
  text: string;
  imageUrl: string | null;
  imageKey: string | null;
  topicTitle: string | null;
  isDemo: boolean;
  options: RunnerOption[];
  answered: boolean;
  selectedOptionId: string | null;
  saved: boolean;
}
interface Feedback {
  isCorrect: boolean;
  correctOptionId: string | null;
  explanation: {
    shortText: string | null;
    detailedText: string | null;
    legalReference: string | null;
    reviewedStatus?: string | null;
  } | null;
}

// Idempotency-key generator for submitAnswer. crypto.randomUUID is UNDEFINED in insecure contexts
// (plain http:// — the Tailscale/LAN transport this app actually serves on), so an unguarded call
// throws on EVERY answer click and no answer ever submits (caught by the 2026-07-02 real-browser UX
// audit; same insecure-context class as the Secure-cookie bug). getRandomValues is NOT
// secure-context-gated, so it covers the plain-http fallback; the last resort is a per-tab counter.
// This file must stay free of nondeterministic random calls — confidence sampling is the pure hash only.
let eventIdCounter = 0;
function newClientEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return `e_${Date.now().toString(36)}_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  }
  return `e_${Date.now().toString(36)}_${(eventIdCounter++).toString(36)}`;
}

// NETWORK-class failure = the action call itself never reached the server (browser offline, or the
// fetch threw — server-action transport losses surface as TypeError: "Failed to fetch"/"Load failed").
// Only these are queueable: a server REJECTION (route reached, item refused) would just be refused
// again on replay, so it keeps the plain inline-retry treatment instead of entering the offline queue.
function isNetworkFailure(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return err instanceof TypeError;
}

export function TestRunner({
  sessionId,
  mode,
  questions: initialQuestions,
  deadlineMs,
}: {
  sessionId: string;
  mode: string;
  questions: RunnerQuestion[];
  deadlineMs: number | null;
}) {
  const router = useRouter();
  const isExam = mode === "EXAM_SIMULATION";
  const isMarathon = mode === "MARATHON";
  const isQuick = mode === "QUICK";
  // Withheld-reveal presentation (spec §E, wave15-01 finding (e)): EXAM_SIMULATION and DIAGNOSTIC
  // both hide per-answer correctness — no ✓/✗ markers, no feedback block, no explanation, no
  // lock-after-answer (answers stay changeable until finish). The Timer/deadline stay EXAM-ONLY
  // (a DIAGNOSTIC run has no timer), so those sites keep the literal `isExam`.
  const revealWithheld = isExam || mode === "DIAGNOSTIC";
  // MARATHON appends pages in place (extendSessionAction); every other mode never mutates the list,
  // so state === prop for them and behavior is unchanged.
  const [questions, setQuestions] = useState<RunnerQuestion[]>(initialQuestions);
  const [exhausted, setExhausted] = useState(false); // MARATHON: pool dry — calm end state, no further refills
  const refillingRef = useRef(false); // in-flight latch: rapid answers must not double-fire the refill
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries(questions.filter((q) => q.selectedOptionId).map((q) => [q.questionId, q.selectedOptionId!])),
  );
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  // Seed from the server so an already-saved question shows the filled "★ Збережено" state on load.
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(questions.filter((q) => q.saved).map((q) => [q.questionId, true])),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<Record<string, boolean>>({}); // answer submit failed → inline «повторити»
  const [queuedOffline, setQueuedOffline] = useState<Record<string, boolean>>({}); // answer in the offline WAL → calm queued chip
  const [imgError, setImgError] = useState<Record<string, boolean>>({}); // q-image failed to load → calm placeholder
  const [flagged, setFlagged] = useState<Record<string, boolean>>({}); // "for review" — client-side only, no server action
  const [confidenceDone, setConfidenceDone] = useState<Record<string, boolean>>({}); // chip tapped OR skipped — never re-show this session
  const [pending, startTransition] = useTransition();
  const [finishing, setFinishing] = useState(false);
  const [confirming, setConfirming] = useState(false); // manual finish opens a confirm step first
  const [softHint, setSoftHint] = useState(false); // QUICK: gentle «~5 хвилин» nudge after the soft-time threshold (no countdown)
  const finishingRef = useRef(false); // idempotency latch: timer onExpire + manual submit must finish once
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]); // per-option refs for arrow-key roving focus
  const questionStartRef = useRef<Record<string, number>>({}); // monotonic ms when each question became active
  const attemptRef = useRef<Record<string, number>>({}); // attempt counter per question (bumps only on a changed choice)
  const eventIdRef = useRef<Record<string, string>>({}); // memoised clientEventId per (sessionId, questionId, attempt)
  // Snapshot of the last submit args per question so «повторити» replays the SAME attempt (same clientEventId).
  const submitArgsRef = useRef<Record<string, { optionId: string; clientEventId: string; latencyMs?: number }>>({});
  // clientEventIds this tab enqueued in the offline WAL, per question — a later DIRECT success for the
  // same question supersedes them (dequeue), so a stale offline answer can't drain over a newer one.
  const walIdsRef = useRef<Record<string, string[]>>({});
  const touchStartRef = useRef<{ x: number; y: number } | null>(null); // swipe gesture origin
  const feedbackRef = useRef<HTMLDivElement | null>(null); // practice feedback block — auto-scroll target
  const fbScrolledRef = useRef<Set<string>>(new Set()); // questions whose feedback was already scrolled into view
  const storageKey = `ds_test_idx:${sessionId}`; // per-tab reload-resume of the question index

  const q = questions[idx];
  const imageSrc = resolveImageSrc({ imageKey: q.imageKey, imageUrl: q.imageUrl });
  // Meaningful alt for the q-image (never empty): the topic name when known, else a generic scene label.
  const imageAlt = q.topicTitle ? `Ілюстрація до питання: ${q.topicTitle}` : "Дорожній знак або дорожня ситуація";
  const answeredCount = Object.keys(selected).length;
  // MARATHON rolling accuracy: from this tab's known feedback (correctness arrives per answer in
  // practice-style modes); «—» until the first answer lands.
  const fbValues = Object.values(feedback);
  const marathonAccuracy =
    fbValues.length > 0 ? Math.round((100 * fbValues.filter((f) => f.isCorrect).length) / fbValues.length) : null;
  const fb = feedback[q.questionId];
  const locked = !revealWithheld && Boolean(fb); // practice: lock after answering (withheld modes stay changeable)
  // roving tabindex: only the checked radio (or the first, when none is checked) is tab-reachable;
  // arrow keys then move + select within the group.
  const selectedIdx = q.options.findIndex((o) => o.id === selected[q.questionId]);
  const rovingIdx = selectedIdx >= 0 ? selectedIdx : 0;

  // Record a monotonic start when the current question becomes active; latencyMs is measured from here.
  useEffect(() => {
    questionStartRef.current[q.questionId] = performance.now();
  }, [q.questionId]);

  // QUICK soft-time hint (spec §E, calm > pressure): after QUICK_SOFT_TIME_SEC on the session, show a
  // gentle non-blocking TEXT nudge — NOT a countdown (no ticking Timer for QUICK). One-shot; never
  // resets, never animates. Fires only for QUICK; every other mode leaves the timer untouched.
  useEffect(() => {
    if (!isQuick) return;
    const t = setTimeout(() => setSoftHint(true), QUICK_SOFT_TIME_SEC * 1000);
    return () => clearTimeout(t);
  }, [isQuick]);

  // Reload-resume: restore the index persisted for THIS session on mount (not a lazy useState
  // initializer — the server render always shows question 1, so restoring pre-hydration would
  // mismatch). sessionStorage can throw in private modes — everything is guarded.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const restored = clampResumeIndex(window.sessionStorage.getItem(storageKey), questions.length);
      if (restored > 0) setIdx(restored);
    } catch {
      // sessionStorage unavailable — start from the first question
    }
  }, [storageKey, questions.length]);

  // Persist the current index so a reload resumes where the user left off (best-effort).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(storageKey, String(idx));
    } catch {
      // private mode — resume simply won't survive a reload
    }
  }, [storageKey, idx]);

  // Digit keys 1..9 SELECT the matching option (choose() still owns submit/lock/pending, so an
  // already-answered practice question is never re-answered). Ignored while typing in a form
  // control, with a modifier held, or while the confirm dialog is open. No deps array: the
  // listener is re-subscribed each render so it always sees the current question's closure.
  useEffect(() => {
    function onDigitKey(e: globalThis.KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || confirming || finishing) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      ) {
        return;
      }
      const optionIdx = digitToOptionIndex(e.key, q.options.length);
      if (optionIdx === null) return;
      choose(q.options[optionIdx].id);
    }
    window.addEventListener("keydown", onDigitKey);
    return () => window.removeEventListener("keydown", onDigitKey);
  });

  // After a practice answer, bring the freshly-rendered feedback/explanation into view — once per
  // question (revisiting an answered question must not yank the scroll), instant when the user
  // prefers reduced motion.
  useEffect(() => {
    if (!fb || fbScrolledRef.current.has(q.questionId)) return;
    fbScrolledRef.current.add(q.questionId);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    feedbackRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [fb, q.questionId]);

  // MARATHON refill (spec §C/§E): when ≤3 unanswered questions remain in the loaded set, append the
  // next page via extendSessionAction — once per trigger (ref latch, so rapid answers can't
  // double-fire), never after exhaustion. `added: 0` = pool dry → terminal calm end state. A network/
  // server failure fails SOFT: state untouched, the next answer re-triggers the effect — no error UI.
  useEffect(() => {
    if (!isMarathon || exhausted || refillingRef.current) return;
    if (questions.length - answeredCount > 3) return;
    refillingRef.current = true;
    void extendSessionAction({ sessionId })
      .then((res) => {
        if (res.added === 0) {
          setExhausted(true);
          return;
        }
        // Append only genuinely new items — questionId-keyed state (feedback/saved maps, navigator
        // keys) must survive the append.
        setQuestions((qs) => {
          const have = new Set(qs.map((x) => x.questionId));
          return [...qs, ...res.questions.filter((nq) => !have.has(nq.questionId))];
        });
      })
      .catch(() => {
        // refill lost in transit — keep the current page; the next answer re-triggers
      })
      .finally(() => {
        refillingRef.current = false;
      });
  }, [isMarathon, exhausted, answeredCount, questions.length, sessionId]);

  function choose(optionId: string) {
    if (locked || pending) return;
    const questionId = q.questionId; // capture: the user may navigate while the action is in flight
    // A CHANGED choice is a genuinely new attempt → new clientEventId; re-picking the same option
    // reuses the id so a resend is treated as a replay, not a new event (wave10f-12 idempotency).
    const prevChoice = selected[questionId];
    let attempt = attemptRef.current[questionId] ?? 0;
    if (optionId !== prevChoice) {
      attempt += 1;
      attemptRef.current[questionId] = attempt;
    }
    const eventKey = `${sessionId}:${questionId}:${attempt}`;
    let clientEventId = eventIdRef.current[eventKey];
    if (!clientEventId) {
      clientEventId = newClientEventId();
      eventIdRef.current[eventKey] = clientEventId;
    }
    // ms the question was on screen before this answer (monotonic; clamped to a non-negative int).
    const startedAt = questionStartRef.current[questionId];
    const latencyMs = startedAt != null ? Math.max(0, Math.round(performance.now() - startedAt)) : undefined;

    setSelected((s) => ({ ...s, [questionId]: optionId }));
    // Non-PII interaction signal: mode + question position + selected option ORDINAL only.
    // Never the answer text / correctness tied to identity (that lane is the existing event model).
    track("test_option_selected", {
      elementLabel: mode,
      metadata: { mode, questionIndex: idx, optionIndex: q.options.findIndex((o) => o.id === optionId) },
    });
    submit(questionId, optionId, clientEventId, latencyMs);
  }

  // Fire the submitAnswer action for one question. A NETWORK-class failure enqueues the attempt in the
  // offline WAL (REUSING its clientEventId — a retry never mints a new id) and shows the calm queued
  // chip; when the queue is unavailable (or the server actively rejected the item) the inline
  // «повторити» affordance appears, and the args snapshot lets the retry replay the SAME attempt
  // (same clientEventId → idempotent), never a new event.
  function submit(questionId: string, optionId: string, clientEventId: string, latencyMs?: number) {
    submitArgsRef.current[questionId] = { optionId, clientEventId, latencyMs };
    const clearFlag = (s: Record<string, boolean>) => {
      if (!s[questionId]) return s;
      const next = { ...s };
      delete next[questionId];
      return next;
    };
    setSubmitError(clearFlag);
    setQueuedOffline(clearFlag);
    startTransition(async () => {
      try {
        const res = await submitAnswerAction({ sessionId, questionId, selectedOptionId: optionId, latencyMs, clientEventId });
        // This answer landed directly — anything this tab queued earlier for the SAME question is now
        // stale; drop it so the drain can't replay an older attempt over the fresher server state.
        const staleWalIds = walIdsRef.current[questionId];
        if (staleWalIds?.length) {
          delete walIdsRef.current[questionId];
          void removeQueued(staleWalIds);
        }
        if (!revealWithheld && "isCorrect" in res) {
          setFeedback((f) => ({
            ...f,
            [questionId]: {
              isCorrect: res.isCorrect ?? false,
              correctOptionId: res.correctOptionId ?? null,
              explanation: res.explanation ?? null,
            },
          }));
        }
      } catch (err) {
        // The answer never reached the server. Network-class loss → write-ahead log (spec §D): the
        // reviewedAt is the client's answer-time clock — the server clamps it, never pre-clamp here.
        if (isNetworkFailure(err)) {
          const enqueued = await enqueueAnswer({
            sessionId,
            questionId,
            selectedOptionId: optionId,
            latencyMs,
            clientEventId,
            reviewedAt: new Date().toISOString(),
          });
          if (enqueued) {
            const ids = (walIdsRef.current[questionId] ??= []);
            if (!ids.includes(clientEventId)) ids.push(clientEventId);
            setQueuedOffline((s) => ({ ...s, [questionId]: true }));
            return;
          }
        }
        // Server rejection, or IndexedDB unavailable — the existing calm inline retry (client state only).
        setSubmitError((e) => ({ ...e, [questionId]: true }));
      }
    });
  }

  function retrySubmit(questionId: string) {
    const args = submitArgsRef.current[questionId];
    if (!args || pending) return;
    submit(questionId, args.optionId, args.clientEventId, args.latencyMs);
  }

  // Arrow keys move the active radio and select it (ARIA radio pattern); Enter/Space are handled
  // natively by the focused <button>. Wraps around; starts at the first/last option when none is set.
  function moveChoice(dir: 1 | -1) {
    const opts = q.options;
    if (opts.length === 0) return;
    const cur = opts.findIndex((o) => o.id === selected[q.questionId]);
    const base = cur < 0 ? (dir === 1 ? -1 : 0) : cur;
    const next = (base + dir + opts.length) % opts.length;
    choose(opts[next].id);
    optionRefs.current[next]?.focus();
  }

  function onOptionsKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (locked || pending) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      moveChoice(1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      moveChoice(-1);
    }
  }

  // Swipe left/right anywhere on the runner navigates next/prev. The pure helper's
  // |deltaY| > |deltaX| guard keeps vertical scrolls (and option drags) inert; no gesture library.
  function onRunnerTouchStart(e: TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    touchStartRef.current = t ? { x: t.clientX, y: t.clientY } : null;
  }

  function onRunnerTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || confirming) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const action = swipeAction(t.clientX - start.x, t.clientY - start.y);
    if (action === "next") setIdx((i) => Math.min(questions.length - 1, i + 1));
    else if (action === "prev") setIdx((i) => Math.max(0, i - 1));
  }

  function finish() {
    if (finishingRef.current) return; // already finishing (e.g. timer fired while manual submit in flight)
    finishingRef.current = true;
    setFinishing(true);
    track("test_finish_clicked", {
      elementLabel: mode,
      metadata: { mode, answered: Object.keys(selected).length, total: questions.length },
    });
    startTransition(async () => {
      await finishTestAction({ sessionId });
    });
  }

  function toggleSave() {
    const questionId = q.questionId; // capture: the user may navigate while the action is in flight
    const next = !saved[questionId];
    setSaved((s) => ({ ...s, [questionId]: next }));
    setSaveError(null);
    startTransition(async () => {
      try {
        await toggleSaveAction({ questionId, save: next });
      } catch {
        // Revert the optimistic toggle for THIS question (idempotent — keyed on the captured id)
        // and surface a small error so the star never lies about the server state.
        setSaved((s) => ({ ...s, [questionId]: !next }));
        setSaveError("Не вдалося оновити збереження. Спробуйте ще раз.");
      }
    });
  }

  // Optional confidence follow-up (Wave 12b §D): fire-and-forget — the action returns { error }
  // rather than throwing, and .catch swallows transport loss, so a failed write NEVER breaks the
  // runner. The prompt hides immediately either way.
  function rateConfidence(questionId: string, confidence: number) {
    setConfidenceDone((d) => ({ ...d, [questionId]: true }));
    void setAnswerConfidenceAction({ sessionId, questionId, confidence }).catch(() => {});
  }

  function toggleFlag() {
    // flag-for-review is purely client-side state; no server action / schema field
    const next = !flagged[q.questionId];
    setFlagged((f) => ({ ...f, [q.questionId]: next }));
    track("test_question_flagged", { elementLabel: mode, metadata: { mode, flagged: next, questionIndex: idx } });
  }

  const isLast = idx === questions.length - 1;

  return (
    <div className="space-y-4" onTouchStart={onRunnerTouchStart} onTouchEnd={onRunnerTouchEnd}>
      {/* Sticky compact chrome (UX-FINDINGS phone pass): mode + counter + timer + progress never
          scroll away while reading options. Emulated-glass surface (12a law — painted fill, no
          backdrop-filter), never transparent, so content can't ghost through; z below the
          confirm modal (z-50). */}
      <div className="glass-e1 sticky top-0 z-20 space-y-2 px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
            {isMarathon ? (
              // rolling counter (spec §C): endless mode has no fixed total — answered + accuracy instead
              <span className="shrink-0 font-display text-base font-semibold text-ink tabular-nums">
                {answeredCount} відповідано · точність {marathonAccuracy === null ? "—" : `${marathonAccuracy}%`}
              </span>
            ) : (
              <span className="shrink-0 font-display text-base font-semibold text-ink tabular-nums">
                {idx + 1} з {questions.length}
              </span>
            )}
            <span className="truncate">· {MODE_LABEL[mode as TestMode] ?? "Тест"}</span>
            {q.topicTitle && <span className="hidden truncate sm:inline">· {q.topicTitle}</span>}
            {q.isDemo && <DemoBadge />}
          </div>
          {isExam && deadlineMs && <Timer deadlineMs={deadlineMs} onExpire={finish} />}
        </div>

        {/* progress */}
        <div className="road">
          <div className="road-fill" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* QUICK soft-time hint — a calm suggestion, never urgency (no red, no blinking, no countdown).
          Announced politely; the choice/progress is already saved, so the user can stop anytime. */}
      {isQuick && softHint && (
        <div
          role="status"
          aria-live="polite"
          data-testid="quick-soft-hint"
          className="rounded-chip border border-line bg-field px-4 py-2.5 text-sm text-muted"
        >
          Минуло близько 5 хвилин. Можна зупинитися будь-коли — прогрес збережено.
        </div>
      )}

      <div className="solid p-5">
        <p id={`q-${q.questionId}`} className="font-display text-lg font-semibold leading-snug text-ink">{q.text}</p>
        {imageSrc &&
          (imgError[q.questionId] ? (
            // q-image failed to load → calm sign-silhouette placeholder (never a broken-image icon).
            // The whole placeholder carries the meaningful alt via role="img" + aria-label.
            <div
              role="img"
              aria-label={imageAlt}
              className="mt-3 flex max-h-56 flex-col items-center justify-center gap-2 rounded-chip border border-line bg-field px-4 py-6 text-center"
            >
              <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden className="text-muted">
                <path
                  d="M12 3 2.5 20h19L12 3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
                <path d="M12 10v4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                <circle cx="12" cy="17" r="0.9" fill="currentColor" />
              </svg>
              <span className="text-xs text-muted">Зображення не завантажилось</span>
            </div>
          ) : (
            // Responsive variants (spec §C): srcSet only for keyed images (the /api/q-image route);
            // a freeform imageUrl has no prebaked variants. `sizes` mirrors the real box: max-w-2xl
            // page (672px) minus layout px-5 + .solid p-5 → 632px, binding above 712px viewport.
            // width/height are a CLS aspect-ratio hint (dominant ~16:9); h-auto restores the true
            // ratio on load. No `loading` attr: the runner renders exactly ONE image — the active
            // question's — and it is the LCP candidate, so it must stay eager.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              srcSet={q.imageKey ? (imageSrcSet(q.imageKey) ?? undefined) : undefined}
              sizes="(max-width: 712px) calc(100vw - 80px), 632px"
              width={720}
              height={405}
              alt={imageAlt}
              onError={() => setImgError((e) => ({ ...e, [q.questionId]: true }))}
              className="mt-3 h-auto w-full rounded-chip border border-line"
            />
          ))}

        <div
          className="mt-4 space-y-2"
          role="radiogroup"
          aria-labelledby={`q-${q.questionId}`}
          onKeyDown={onOptionsKeyDown}
        >
          {q.options.map((o, i) => {
            const isSelected = selected[q.questionId] === o.id;
            // non-colour correctness marker — only when practice feedback exists (no `fb` ⇒ no leak in an exam)
            let mark: "correct" | "wrong" | null = null;
            if (fb) {
              if (o.id === fb.correctOptionId) mark = "correct";
              else if (isSelected) mark = "wrong";
            }
            return (
              <button
                key={o.id}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={i === rovingIdx ? 0 : -1}
                onClick={() => choose(o.id)}
                disabled={locked || pending}
                className={cx(
                  "opt text-sm",
                  mark === "correct" && "correct",
                  mark === "wrong" && "wrong",
                  isSelected && !fb && "ring-2 ring-green-deep",
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
              </button>
            );
          })}
        </div>

        {/* offline-queued answer — reassurance, NOT an error: the choice stays selected, the WAL
            drains on reconnect, feedback arrives when it arrives (spec §D) */}
        {queuedOffline[q.questionId] && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 rounded-chip border border-line bg-field px-3 py-2 text-sm text-muted"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="shrink-0">
              <path
                d="M6.5 18a4.5 4.5 0 0 1-.42-8.98 6 6 0 0 1 11.7 1.2A4 4 0 0 1 17.5 18h-11Z"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            </svg>
            <span>{"Збережемо, щойно з'явиться мережа"}</span>
          </div>
        )}

        {/* inline submit-failure retry — calm, never red-flooded; replays the same attempt (idempotent) */}
        {submitError[q.questionId] && (
          <div
            role="status"
            className="mt-3 flex items-center justify-between gap-2 rounded-chip border border-line bg-field px-3 py-2 text-sm text-muted"
          >
            <span>Не вдалося зберегти відповідь.</span>
            <button
              type="button"
              onClick={() => retrySubmit(q.questionId)}
              disabled={pending}
              aria-label="повторити збереження відповіді"
              className="inline-flex min-h-[44px] items-center rounded-chip px-3 font-medium text-green-deep hover:bg-green-soft/20 disabled:opacity-50"
            >
              {pending ? "Повторюємо…" : "Повторити"}
            </button>
          </div>
        )}

        {/* practice feedback */}
        {fb && (
          <div ref={feedbackRef} className="mt-4 rounded-lg border border-line bg-field p-4">
            <Badge tone={fb.isCorrect ? "go" : "danger"}>{fb.isCorrect ? "Правильно" : "Неправильно"}</Badge>
            {fb.explanation?.shortText && <p className="mt-2 text-sm font-medium text-ink">{fb.explanation.shortText}</p>}
            {fb.explanation?.detailedText && <p className="mt-1 text-sm text-muted">{fb.explanation.detailedText}</p>}
            {fb.explanation?.legalReference && <p className="mt-2 text-xs text-muted">{fb.explanation.legalReference}</p>}
            {fb.explanation && <ExplanationNotice reviewedStatus={fb.explanation.reviewedStatus} />}

            {/* sampled confidence follow-up — optional, never blocks «Далі»/finish (the nav bar
                below has zero coupling to this state). Exam sessions never show it. */}
            {!revealWithheld &&
              isConfidenceSampled(sessionId, q.questionId) &&
              !confidenceDone[q.questionId] && (
                <div
                  role="group"
                  aria-label="Наскільки впевнено ви відповідали?"
                  className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3"
                >
                  <span className="text-sm text-muted">Наскільки впевнено?</span>
                  {[1, 2, 3, 4].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => rateConfidence(q.questionId, c)}
                      aria-label={`впевненість ${c} з 4`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-chip border border-line bg-white text-sm font-medium text-ink hover:bg-green-soft/20"
                    >
                      {c}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setConfidenceDone((d) => ({ ...d, [q.questionId]: true }))}
                    className="inline-flex min-h-11 items-center rounded-chip px-3 text-sm font-medium text-muted hover:bg-green-soft/20"
                  >
                    Пропустити
                  </button>
                </div>
              )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleSave}
            aria-label={saved[q.questionId] ? "Прибрати питання зі збережених" : "Зберегти питання"}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-chip px-3 text-sm font-medium text-green-deep hover:bg-green-soft/20"
          >
            {saved[q.questionId] ? "★ Збережено" : "☆ Зберегти питання"}
          </button>
          <button
            type="button"
            onClick={toggleFlag}
            aria-label={flagged[q.questionId] ? "Зняти позначку до перегляду" : "Позначити питання до перегляду"}
            className={cx(
              "inline-flex min-h-[44px] items-center gap-1.5 rounded-chip px-3 text-sm font-medium hover:bg-green-soft/20",
              flagged[q.questionId] ? "text-warn" : "text-muted",
            )}
          >
            {flagged[q.questionId] ? "⚑ До перегляду" : "⚐ Позначити"}
          </button>
        </div>
        {saveError && (
          <p role="status" className="mt-2 text-xs text-warn">
            {saveError}
          </p>
        )}
      </div>

      {/* MARATHON pool exhausted — calm end state (spec §C): no error, no further refills, just finish */}
      {isMarathon && exhausted && (
        <div role="status" className="rounded-xl border border-line bg-card p-4 text-center">
          <p className="font-display text-base font-semibold text-ink">Все пройдено</p>
          <p className="mt-1 text-sm text-muted">
            Нові питання в цій категорії закінчились. Завершіть тест, щоб побачити результат.
          </p>
          <Button className="mt-3 min-h-11" onClick={() => setConfirming(true)} disabled={finishing}>
            {finishing ? "Завершуємо…" : "Завершити тест"}
          </Button>
        </div>
      )}

      {/* nav — thumb-zone sticky action bar on phone (the tab capsule is hidden during a test,
          see app-nav.tsx, so bottom-0 is unobstructed); resets to today's inline row at sm:
          (desktop keeps inline). Opaque bar — content never ghosts through the thumb zone. */}
      <div className="sticky bottom-0 z-20 -mx-5 flex items-center justify-between gap-3 border-t border-line bg-field px-5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:static sm:z-auto sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0">
        <Button
          variant="secondary"
          className="min-h-11"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          Назад
        </Button>
        <div className="flex gap-2">
          {!isLast && (
            <Button
              data-track-label="test_next"
              className="min-h-11"
              onClick={() => {
                track("test_next_clicked", { elementLabel: mode, metadata: { mode, questionIndex: idx } });
                setIdx((i) => Math.min(questions.length - 1, i + 1));
              }}
            >
              Далі
            </Button>
          )}
          {(isLast || isExam || isMarathon) && (
            <Button
              variant={isLast ? "primary" : "secondary"}
              className="min-h-11"
              onClick={() => setConfirming(true)}
              disabled={finishing}
            >
              {finishing ? "Завершуємо…" : "Завершити тест"}
            </Button>
          )}
        </div>
      </div>

      {/* navigator: jump to any question; answered / unanswered / flagged at a glance.
          States use markers (✓ / ⚑) AND classes, not colour alone. */}
      <nav aria-label="Навігатор питань" className="rounded-xl border border-line bg-card p-3">
        {/* 6 cols on phone so every cell stays ≥44px wide inside 390px (UX-FINDINGS: 35×36 cells) */}
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
          {questions.map((nq, i) => {
            const isAnswered = Boolean(selected[nq.questionId]);
            const isFlagged = Boolean(flagged[nq.questionId]);
            const isCurrent = i === idx;
            let tone = "border-line bg-white text-muted"; // unanswered
            if (isAnswered) tone = "border-green-deep bg-green-deep/10 font-semibold text-ink"; // answered
            if (isCurrent) tone = "border-green-deep bg-green-deep/10 font-semibold text-ink ring-1 ring-green-deep"; // current
            const state = isAnswered ? "відповідь надано" : "без відповіді";
            return (
              <button
                key={nq.questionId}
                type="button"
                onClick={() => setIdx(i)}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`Питання ${i + 1}: ${state}${isFlagged ? ", позначено до перегляду" : ""}`}
                className={cx(
                  "relative flex min-h-11 min-w-11 items-center justify-center rounded-md border text-xs tabular-nums transition-colors",
                  tone,
                )}
              >
                {isAnswered && (
                  <span aria-hidden className="absolute left-0.5 top-0 text-[9px] leading-none text-green-deep">✓</span>
                )}
                {i + 1}
                {isFlagged && (
                  <span aria-hidden className="absolute -right-0.5 -top-1 text-[11px] leading-none text-warn">⚑</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {revealWithheld && (
        <p className="text-center text-xs text-muted">
          Відповіли на {answeredCount} з {questions.length}. Завершіть тест, щоб побачити результат.
        </p>
      )}

      {/* confirm-before-finish: gate the manual «Завершити тест» behind an explicit confirm step */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-line bg-card p-5 shadow-lg">
            <p className="font-display text-lg font-semibold text-ink">Завершити тест?</p>
            {answeredCount < questions.length ? (
              <p className="mt-2 text-sm text-muted">
                Ви відповіли на {answeredCount} з {questions.length}. Незавершені питання буде зараховано як неправильні.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">Ви відповіли на всі питання. Завершити тест і побачити результат?</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={finishing}>
                Скасувати
              </Button>
              <Button onClick={finish} disabled={finishing}>
                {finishing ? "Завершуємо…" : "Завершити"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Timer({ deadlineMs, onExpire }: { deadlineMs: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadlineMs - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, deadlineMs - Date.now());
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadlineMs, onExpire]);
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const low = remaining < 60000;
  // Announce remaining time (and the low-time state) to assistive tech — colour alone isn't conveyed.
  const label = `Залишилось часу: ${mm} хв ${ss} с${low ? ", залишилось мало часу" : ""}`;
  return (
    <span
      role="timer"
      aria-live="polite"
      aria-label={label}
      className={cx("font-display text-lg font-bold tabular-nums", low ? "text-warn" : "text-ink")}
    >
      {mm}:{String(ss).padStart(2, "0")}
    </span>
  );
}
