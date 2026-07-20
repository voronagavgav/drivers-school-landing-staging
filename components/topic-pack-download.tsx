"use client";

// «Завантажити тему для офлайн» (spec §E, client half): the quiet per-topic
// affordance on «Карта тем» rows. Icon-button scale — it never competes with
// the row's practice action. Tapping opens the ONE bold moment of the flow: a
// confirm dialog whose headline is the HONEST size («≈X МБ», real bytes from
// estimatePack), with «Завантажити»/«Скасувати». After a completed download
// the affordance flips to a non-interactive «Доступно офлайн» state (derived
// from listPacks() on mount). Failure → calm inline retry copy; the write
// order inside downloadPack guarantees no half-written pack, so retry is
// always just "press the same button again".

import { useEffect, useState } from "react";
import { downloadPack, estimatePack, listPacks } from "@/lib/offline/packs";
import { Button } from "@/components/ui";

const MB = 1024 * 1024;

/** «≈X,X МБ» — one decimal, Ukrainian decimal comma; a tiny text-only pack
 *  floors at 0,1 so the headline never reads «≈0,0 МБ». */
function formatMb(bytes: number): string {
  return `≈${Math.max(bytes / MB, 0.1).toFixed(1).replace(".", ",")} МБ`;
}

export function TopicPackDownload({ topicId, title }: { topicId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [failed, setFailed] = useState<"retryable" | "unsupported" | "budget" | null>(null);
  const [busy, setBusy] = useState(false);

  // Downloaded state comes from IndexedDB, so it must be read post-hydration
  // (a lazy initializer would SSR-mismatch — see components/CLAUDE.md).
  useEffect(() => {
    let cancelled = false;
    void listPacks().then((packs) => {
      if (!cancelled && packs.some((p) => p.id === topicId)) setDownloaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  async function runEstimate() {
    setFailed(null);
    setTotalBytes(null);
    const estimate = await estimatePack(topicId);
    if (estimate) setTotalBytes(estimate.totalBytes);
    else setFailed("retryable");
  }

  async function download() {
    setBusy(true);
    setFailed(null);
    const result = await downloadPack(topicId);
    setBusy(false);
    if (result.ok) {
      setDownloaded(true);
      setOpen(false);
    } else {
      // "unsupported" is permanent (no Cache Storage/IndexedDB — e.g. an
      // insecure origin); "budget" needs freeing space first (delete in
      // Профіль); everything else is worth the same button again.
      setFailed(
        result.reason === "unsupported" || result.reason === "budget"
          ? result.reason
          : "retryable",
      );
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={downloaded ? `Доступно офлайн: ${title}` : `Завантажити для офлайн: ${title}`}
        title={downloaded ? "Доступно офлайн" : "Завантажити для офлайн"}
        disabled={downloaded}
        onClick={() => {
          setOpen(true);
          void runEstimate();
        }}
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-green-deep transition-colors hover:bg-green-soft/20 disabled:hover:bg-transparent"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          {downloaded ? (
            <path d="M5 13l4 4 10-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <path d="M12 4v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 19h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {/* size-confirm: the honest «≈X МБ» is the headline — same modal shell as the runner's finish-confirm */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Завантаження теми для офлайн"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
        >
          <div className="w-full max-w-sm rounded-xl border border-line bg-card p-5 shadow-lg">
            <p className="font-display text-lg font-semibold text-ink">Завантажити тему для офлайн?</p>
            <p className="mt-2 text-sm text-muted">{title}</p>
            {failed ? (
              <p role="alert" className="mt-3 text-sm text-warn">
                {failed === "unsupported"
                  ? "Цей браузер не підтримує офлайн-збереження."
                  : failed === "budget"
                    ? "Не вистачає місця — ліміт 50 МБ. Видаліть непотрібні пакети у Профілі та поверніться."
                    : "Не вдалося завантажити — спробуйте ще раз."}
              </p>
            ) : (
              <p className="mt-3 font-display text-2xl font-bold tabular-nums text-ink">
                {totalBytes == null ? (
                  <span className="text-base font-normal text-muted">Рахуємо розмір…</span>
                ) : (
                  formatMb(totalBytes)
                )}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
                Скасувати
              </Button>
              <Button
                onClick={() => (totalBytes == null && failed ? void runEstimate() : void download())}
                disabled={
                  busy || (totalBytes == null && !failed) || failed === "unsupported" || failed === "budget"
                }
              >
                {busy ? "Завантажуємо…" : "Завантажити"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
