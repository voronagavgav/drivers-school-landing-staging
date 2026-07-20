"use client";

import { useEffect, useState } from "react";
import { Card, LinkButton } from "@/components/ui";
import { ANON_SAVE_PROMPT_THRESHOLD } from "@/lib/constants";

// Non-blocking "save your progress" invitation for an ANONYMOUS visitor (Wave 17 funnel, spec §06).
// It is an invitation, never a gate — a quiet card that sits ALONGSIDE the content, never a
// full-screen interstitial and never intercepting the answer/continue controls (learn from the
// calm-ritual overlay trap, root CLAUDE.md wave14-14).
//
// Client-bundle law (root CLAUDE.md, 1st learning): this file imports NOTHING from the server graph
// (data, auth, or rbac helpers). `isAnonymous` and the anon-progress count are computed SERVER-side
// and handed in as plain props; ANON_SAVE_PROMPT_THRESHOLD is a pure constant (safe client-side).
//
// TRIGGER is a COUNT, not a timer: it shows once the anon visitor has answered
// ANON_SAVE_PROMPT_THRESHOLD questions (or reached another save-worthy milestone the caller folds
// into `progressCount`). Dismissal is device-scoped in localStorage (`ds_save_prompt_dismissed`) —
// one prompt per session, «Не зараз» sticks and it does not nag again.

const DISMISS_KEY = "ds_save_prompt_dismissed";

export function SaveProgressPrompt({
  isAnonymous,
  progressCount,
}: {
  isAnonymous: boolean;
  progressCount: number;
}) {
  // Start hidden and reveal in a mount effect (like InstallHint): the dismissed flag lives in
  // localStorage, so deciding visibility on the server would flash-then-hide / mismatch hydration.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAnonymous) return;
    if (progressCount < ANON_SAVE_PROMPT_THRESHOLD) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    setVisible(true);
  }, [isAnonymous, progressCount]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    // motion-safe entrance only — a reduced-motion visitor gets no springy slide.
    <Card className="max-w-md motion-safe:animate-[softglow_.5s_ease-out]">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Зберегти прогрес і готовність
          </h2>
          <p className="mt-1 text-sm text-muted">
            Твої відповіді й готовність залишаться з тобою — на будь-якому пристрої.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* The ONE bold moment — the save CTA keeps its name through the flow. */}
          <LinkButton href="/register">Зберегти прогрес</LinkButton>
          {/* Neutral dismiss — direct, never confirmshaming. */}
          <button
            type="button"
            onClick={dismiss}
            className="min-h-[44px] px-2 text-sm text-muted hover:text-ink"
          >
            Не зараз
          </button>
        </div>
      </div>
    </Card>
  );
}
