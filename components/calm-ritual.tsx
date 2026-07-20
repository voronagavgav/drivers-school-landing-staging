"use client";

// Pre-exam calm ritual (spec §C). A CLIENT-ONLY overlay shown between the exam CTA and the real
// `startTestAction` submit: optional, always skippable, never blocking. It fails OPEN — without JS
// the wrapped `<form action={startTestAction}>` posts straight to the server action (React 19
// progressive enhancement); we only intercept once mounted/hydrated.
//
// Client-bundle trap (root CLAUDE.md, 1st learning): this file imports NOTHING from lib/server,
// lib/auth, lib/rbac or lib/db. `startTestAction` is a "use server" action reference, which is safe
// to import client-side — it resolves to an action ref, not the server code.
//
// Documented trade-off: the twice-a-day guard lives in localStorage, so it is PER-DEVICE and resets
// across devices/browsers. Accepted — the ritual is a gentle nudge, not a gate (client-only per spec).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { startTestAction } from "@/app/actions/test";
import { track } from "@/lib/client/track";
import { Button } from "@/components/ui";
import { Svitlyk } from "@/components/svitlyk";

// The ONE bold moment of the flow — copy pinned exactly (no exclamation, no guilt).
const RITUAL_COPY = "Хвилина спокою — і починаємо. Це тренування формату, не вирок.";
const STORAGE_KEY = "ds_calm_ritual_day";
const MAX_SHOWS_PER_DAY = 2;
// Auto-continue ceiling — the ritual may never BLOCK starting; after this it submits itself.
const AUTO_CONTINUE_MS = 60_000;
// ~19s 4-7-8-ish breathing cycle (exact keyframes free per spec).
const BREATH_MS = 19_000;

/** Local calendar day key (client-only; the twice-a-day guard is intentionally per-device). */
function localDayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's show count from localStorage (value shape `<day>:<count>`). 0 when absent / another day. */
function readTodayCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const [day, count] = raw.split(":");
    return day === localDayKey() ? Math.max(0, Number(count) || 0) : 0;
  } catch {
    return 0;
  }
}

/** Persist an incremented show count for today (`<day>:<count>`). */
function bumpTodayCount(): void {
  try {
    localStorage.setItem(STORAGE_KEY, `${localDayKey()}:${readTodayCount() + 1}`);
  } catch {
    /* storage disabled — fail open: the ritual simply won't remember */
  }
}

/**
 * Wraps an exam-start CTA. Renders the real `<form action={startTestAction}>` (with the hidden
 * `mode` input) around `children` (the submit button). Clicking the CTA first shows a full-screen
 * calm overlay; the overlay auto-continues after 60s or on «Почати одразу». Bypassed entirely once
 * shown twice today.
 */
export function CalmRitual({ mode, children }: { mode: string; children: ReactNode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const lampRef = useRef<HTMLSpanElement>(null);
  // Set on our own programmatic submit so the second onSubmit pass falls through to the real action.
  const bypassRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function submitReal() {
    bypassRef.current = true;
    formRef.current?.requestSubmit();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Fall through to the real submit on our own re-submit, or once the ritual is spent for today.
    if (bypassRef.current || readTodayCount() >= MAX_SHOWS_PER_DAY) return;
    event.preventDefault();
    bumpTodayCount();
    track("calm_ritual_started");
    setOpen(true);
  }

  function handleSkip() {
    track("calm_ritual_skipped");
    submitReal();
  }

  // Auto-continue at 60s — same for the reduced-motion path (the ritual never blocks starting).
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(submitReal, AUTO_CONTINUE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  // Breathing pacer via the Web Animations API — deliberately NOT a CSS @keyframes: the app's
  // idle-freeze (`.bg-idle * { animation: none }`, glass-shell) would otherwise pause the loop the
  // moment the user sits still, which is exactly when the ritual is doing its job. Skipped under
  // reduced motion (a first-class equal: same copy, same button, same auto-continue — just static).
  useEffect(() => {
    if (!open || reducedMotion) return;
    const el = lampRef.current;
    if (!el || typeof el.animate !== "function") return;
    const anim = el.animate(
      [
        { transform: "scale(0.82)", opacity: 0.55, offset: 0 }, // rest
        { transform: "scale(1)", opacity: 1, offset: 0.21 }, // inhale (~4s)
        { transform: "scale(1)", opacity: 1, offset: 0.58 }, // hold (~7s)
        { transform: "scale(0.82)", opacity: 0.55, offset: 1 }, // exhale (~8s)
      ],
      { duration: BREATH_MS, iterations: Infinity, easing: "ease-in-out" },
    );
    return () => anim.cancel();
  }, [open, reducedMotion]);

  return (
    <>
      <form ref={formRef} action={startTestAction} onSubmit={handleSubmit} noValidate>
        <input type="hidden" name="mode" value={mode} />
        {children}
      </form>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Хвилина спокою перед іспитом"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-field px-6 text-center"
        >
          {/* Світлик's green go-lamp as the pacer — the only motion on this quiet screen. */}
          <span
            ref={lampRef}
            className="relative inline-flex items-center justify-center"
            style={{ willChange: "transform, opacity" }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-full"
              style={{
                background: "radial-gradient(closest-side, var(--color-green-deep), transparent)",
                opacity: 0.4,
              }}
            />
            <Svitlyk size={132} />
          </span>

          <p className="max-w-sm font-display text-lg leading-relaxed text-ink">{RITUAL_COPY}</p>

          {/* autoFocus lands the focus ring on the always-visible skip control (a11y). */}
          <Button autoFocus type="button" variant="primary" onClick={handleSkip}>
            Почати одразу
          </Button>
        </div>
      )}
    </>
  );
}
