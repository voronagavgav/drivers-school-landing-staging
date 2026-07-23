"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { CopySimple } from "@phosphor-icons/react/dist/csr/CopySimple";

const CONTACT_EMAIL = "hello@drivers.school";

type CopyState = "idle" | "copying" | "copied" | "failed";

async function copyEmail() {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API unavailable");
  }

  await navigator.clipboard.writeText(CONTACT_EMAIL);
}

export function ContactEmailActions() {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    if (copyState === "copying") return;
    if (resetTimer.current) clearTimeout(resetTimer.current);

    setCopyState("copying");
    try {
      await copyEmail();
      setCopyState("copied");
      resetTimer.current = setTimeout(() => setCopyState("idle"), 3000);
    } catch {
      setCopyState("failed");
    }
  };

  const copied = copyState === "copied";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="trust-contact-action inline-flex min-h-11 items-center justify-center rounded-card bg-pink-300 px-5 text-sm font-semibold text-pink-ink hover:bg-pink-400"
      >
        Написати листа
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-disabled={copyState === "copying"}
        className="trust-contact-action inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-white/20 px-4 text-sm font-semibold text-text-on-dark transition-colors hover:border-white/35 hover:bg-white/8"
      >
        {copied ? (
          <Check size={17} weight="bold" aria-hidden="true" />
        ) : (
          <CopySimple size={17} weight="bold" aria-hidden="true" />
        )}
        {copyState === "copying"
          ? "Копіюємо…"
          : copied
            ? "Адресу скопійовано"
            : "Скопіювати адресу"}
      </button>
      <span className="w-full text-xs leading-5 text-text-on-dark-muted" aria-live="polite">
        {copyState === "failed"
          ? "Не вдалося скопіювати. Виділіть адресу вище вручну."
          : copied
            ? "Адреса готова для вставлення у ваш поштовий застосунок."
            : ""}
      </span>
    </div>
  );
}
