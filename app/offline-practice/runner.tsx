"use client";

// «Офлайн-практика» (wave13-17): a client-only runner over a downloaded pack.
// The pack comes from IndexedDB, images from the app-owned ds-pack-images cache,
// progress lives in memory — the statically-prerendered (and precached) document
// plays with the network fully dead. Immediate feedback is computed from the
// pack's cached correctness/explanation. Every answer enqueues a SESSIONLESS WAL
// item (no sessionId): the shared drain lanes replay it into the SRS review lane
// — no test session exists for an offline run, so it counts toward повторення,
// never toward exam/practice stats (task decision). Correctness is recomputed on
// the server from stored options; the cached isCorrect here is feedback-only.

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Badge, Button, cx } from "@/components/ui";
import { Svitlyk } from "@/components/svitlyk";
import { listPacks, type StoredPack } from "@/lib/offline/packs";
import { enqueueAnswer } from "@/lib/offline/wal";

type PackQuestion = StoredPack["questions"][number];

// Idempotency key for each queued answer. crypto.randomUUID is UNDEFINED in insecure
// contexts (the plain-http LAN transport) — same guarded ladder as the main runner:
// randomUUID → getRandomValues → per-tab counter.
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

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; pack: StoredPack };

export function OfflinePracticeRunner() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  // Pack id from the query string + the IndexedDB row, both read post-hydration
  // (the document is static, so a pre-hydration read would SSR-mismatch).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("pack");
    if (!id) {
      setLoad({ status: "missing" });
      return;
    }
    void listPacks().then((packs) => {
      const pack = packs.find((p) => p.id === id);
      setLoad(pack && pack.questions.length > 0 ? { status: "ready", pack } : { status: "missing" });
    });
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Офлайн-практика</h1>
        {load.status === "ready" && (
          <p className="mt-1 text-sm text-muted">
            {load.pack.title} · {"відповіді збережуться на пристрої і зарахуються в повторення"}
          </p>
        )}
      </div>

      {load.status === "loading" && (
        <p className="text-sm text-muted" role="status">
          Завантажуємо збережену тему…
        </p>
      )}

      {/* unknown/absent pack — a calm landing back to the downloaded list, never an error */}
      {load.status === "missing" && (
        <div className="solid flex flex-col items-center gap-3 p-6 text-center">
          <Svitlyk size={96} />
          <p className="font-display text-lg font-semibold text-ink">Цю тему ще не завантажено</p>
          <p className="text-sm text-muted">
            Оберіть одну зі збережених тем — або завантажте нову, щойно буде мережа.
          </p>
          <a
            href="/~offline"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill bg-green-soft px-5 py-3 text-sm font-semibold text-green-ink hover:brightness-[.97] active:scale-[.985]"
          >
            До завантажених тем
          </a>
        </div>
      )}

      {load.status === "ready" && <PackRunner pack={load.pack} />}
    </div>
  );
}

function PackRunner({ pack }: { pack: StoredPack }) {
  const questions = pack.questions;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  // per question: true = WAL row written (will sync), false = queue unavailable
  const [queued, setQueued] = useState<Record<string, boolean>>({});
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]); // per-option refs for arrow-key roving focus
  const startRef = useRef<Record<string, number>>({}); // monotonic ms when each question became active
  const feedbackRef = useRef<HTMLDivElement | null>(null); // feedback block — auto-scroll target
  const fbScrolledRef = useRef<Set<string>>(new Set()); // questions whose feedback was already scrolled into view

  const q = questions[idx];
  const chosen = selected[q.id];
  const correctOptionId = q.options.find((o) => o.isCorrect)?.id ?? null;
  const fb = chosen ? { isCorrect: chosen === correctOptionId } : null;
  const locked = Boolean(fb); // practice semantics: lock after answering
  const answeredCount = Object.keys(selected).length;
  const done = answeredCount === questions.length;
  const correctCount = questions.filter(
    (question) => selected[question.id] && question.options.find((o) => o.id === selected[question.id])?.isCorrect,
  ).length;
  const imageAlt =
    pack.type === "topic" ? `Ілюстрація до питання: ${pack.title}` : "Дорожній знак або дорожня ситуація";
  // roving tabindex: only the checked radio (or the first, when none) is tab-reachable
  const selectedIdx = q.options.findIndex((o) => o.id === chosen);
  const rovingIdx = selectedIdx >= 0 ? selectedIdx : 0;

  // Record a monotonic start when the current question becomes active; latencyMs measures from here.
  useEffect(() => {
    startRef.current[q.id] = performance.now();
  }, [q.id]);

  // Bring freshly-rendered feedback into view — once per question, instant under reduced motion.
  useEffect(() => {
    if (!fb || fbScrolledRef.current.has(q.id)) return;
    fbScrolledRef.current.add(q.id);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    feedbackRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [fb, q.id]);

  function choose(optionId: string) {
    if (locked) return;
    const question = q;
    const startedAt = startRef.current[question.id];
    const latencyMs = startedAt != null ? Math.max(0, Math.round(performance.now() - startedAt)) : undefined;
    setSelected((s) => ({ ...s, [question.id]: optionId }));
    // Sessionless WAL item (spec §E): NO sessionId — the review-sync route applies it
    // to the review lane only. reviewedAt is the client clock; the server clamps it.
    void enqueueAnswer({
      questionId: question.id,
      selectedOptionId: optionId,
      latencyMs,
      clientEventId: newClientEventId(),
      reviewedAt: new Date().toISOString(),
    }).then((ok) => setQueued((s) => ({ ...s, [question.id]: ok })));
  }

  // Arrow keys move the active radio and select it (ARIA radio pattern); wraps around.
  function moveChoice(dir: 1 | -1) {
    const opts = q.options;
    if (opts.length === 0) return;
    const cur = opts.findIndex((o) => o.id === chosen);
    const base = cur < 0 ? (dir === 1 ? -1 : 0) : cur;
    const next = (base + dir + opts.length) % opts.length;
    choose(opts[next].id);
    optionRefs.current[next]?.focus();
  }

  function onOptionsKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (locked) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      moveChoice(1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      moveChoice(-1);
    }
  }

  const isLast = idx === questions.length - 1;

  return (
    <div className="space-y-4">
      {/* compact sticky chrome — same emulated-glass surface as the main runner */}
      <div className="glass-e1 sticky top-0 z-20 space-y-2 px-4 py-2.5">
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span className="shrink-0 font-display text-base font-semibold text-ink tabular-nums">
            {idx + 1} з {questions.length}
          </span>
          <span className="truncate">{pack.title}</span>
        </div>
        <div className="road">
          <div className="road-fill" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="solid p-5">
        <p id={`q-${q.id}`} className="font-display text-lg font-semibold leading-snug text-ink">
          {q.text}
        </p>
        {q.imageKey && <PackImage key={q.id} imageKey={q.imageKey} alt={imageAlt} />}

        <div className="mt-4 space-y-2" role="radiogroup" aria-labelledby={`q-${q.id}`} onKeyDown={onOptionsKeyDown}>
          {q.options.map((o, i) => {
            const isSelected = chosen === o.id;
            // non-colour correctness marker — only after this question is answered
            let mark: "correct" | "wrong" | null = null;
            if (fb) {
              if (o.id === correctOptionId) mark = "correct";
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
                disabled={locked}
                className={cx("opt text-sm", mark === "correct" && "correct", mark === "wrong" && "wrong")}
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

        {/* queued for sync — reassurance, NOT an error (wave13-12 copy) */}
        {queued[q.id] === true && (
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
        {/* the WAL is unavailable (storage refused) — the answer still counts on screen, honestly flagged */}
        {queued[q.id] === false && (
          <p role="status" className="mt-3 text-sm text-muted">
            Не вдалося поставити відповідь у чергу синхронізації — у повторення вона не потрапить.
          </p>
        )}

        {/* immediate feedback from the cached pack data */}
        {fb && (
          <div ref={feedbackRef} className="mt-4 rounded-lg border border-line bg-field p-4">
            <Badge tone={fb.isCorrect ? "go" : "danger"}>{fb.isCorrect ? "Правильно" : "Неправильно"}</Badge>
            {q.explanationText && <p className="mt-2 text-sm text-muted">{q.explanationText}</p>}
          </div>
        )}
      </div>

      {/* pack finished — client-side tally only; the server tally lands with the sync */}
      {done && (
        <div className="solid flex flex-col items-center gap-3 p-6 text-center">
          <p className="font-display text-lg font-semibold text-ink">Тему пройдено!</p>
          <p className="text-sm text-muted">
            Правильно {correctCount} з {questions.length}.{" "}
            {"Відповіді зарахуються в повторення, щойно з'явиться мережа."}
          </p>
          <a
            href="/~offline"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill bg-green-soft px-5 py-3 text-sm font-semibold text-green-ink hover:brightness-[.97] active:scale-[.985]"
          >
            До завантажених тем
          </a>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          className="min-h-11"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          Назад
        </Button>
        <Button
          className="min-h-11"
          onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
          disabled={isLast}
        >
          Далі
        </Button>
      </div>
    </div>
  );
}

function PackImage({ imageKey, alt }: { imageKey: string; alt: string }) {
  // The exact URL downloadPack cached — Cache Storage keys purely on URL.
  const url = `/api/q-image/${encodeURIComponent(imageKey)}?w=540`;
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Resolve from Cache Storage FIRST: pack images live in the app-owned
  // ds-pack-images cache, which the service worker's runtime q-image lane does
  // NOT consult — caches.match searches every cache, so the stored bytes render
  // with the network dead. Cache miss or no Cache Storage → the network URL.
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    async function resolve() {
      if (typeof caches !== "undefined") {
        try {
          const hit = await caches.match(url);
          if (hit) {
            const blob = await hit.blob();
            const obj = URL.createObjectURL(blob);
            if (cancelled) {
              URL.revokeObjectURL(obj);
              return;
            }
            objectUrl = obj;
            setSrc(obj);
            return;
          }
        } catch {
          // Cache Storage refused — fall through to the network URL.
        }
      }
      if (!cancelled) setSrc(url);
    }
    void resolve();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (failed) {
    // image unavailable → the runner's calm sign-silhouette placeholder
    return (
      <div
        role="img"
        aria-label={alt}
        className="mt-3 flex max-h-56 flex-col items-center justify-center gap-2 rounded-chip border border-line bg-field px-4 py-6 text-center"
      >
        <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden className="text-muted">
          <path d="M12 3 2.5 20h19L12 3Z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M12 10v4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" />
        </svg>
        <span className="text-xs text-muted">Зображення не завантажилось</span>
      </div>
    );
  }
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={720}
      height={405}
      alt={alt}
      onError={() => setFailed(true)}
      className="mt-3 h-auto w-full rounded-chip border border-line"
    />
  );
}
