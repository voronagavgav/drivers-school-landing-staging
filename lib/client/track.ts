// ---------------------------------------------------------------------------
// First-party, privacy-respecting client analytics tracker (browser-only).
//
// Responsibilities:
//   - a per-session sessionId (rotates per browsing session; sessionStorage)
//   - auto-capture PAGE VIEWS (driven by <AnalyticsProvider/> on route change)
//   - auto-capture CLICKS via ONE delegated document listener (records element
//     role / aria-label / visible text / data-track-* — NEVER input values)
//   - time-on-page (durationMs sent with the page_view of the page being left)
//   - track(eventType, props) for explicit instrumentation
//   - batch events (pure TrackBuffer) and flush on an interval + on
//     visibilitychange / pagehide via navigator.sendBeacon (fetch fallback)
//   - RESPECT navigator.doNotTrack / globalThis Sec-GPC equivalent + a stored
//     opt-out cookie (ds_no_analytics). Default first-party analytics ON, but
//     honour DNT / GPC / opt-out — when suppressed we record + send NOTHING.
//
// The persistent visitor id (anonymousId) is NOT managed here: the server mints
// it into a first-party httpOnly `ds_anon` cookie (lib/server/analytics-ingest.ts)
// so the client can't read or spoof it. We only own the sessionId.
//
// PRIVACY: never read/enqueue input values. The click handler deliberately reads
// only role/label/text/data-track, and `track()` callers pass non-PII props; the
// server zod whitelist is the backstop.
// ---------------------------------------------------------------------------

import {
  TrackBuffer,
  chunkEvents,
  DEFAULT_TRACK_BUFFER_CONFIG,
  type ClientTrackEvent,
} from "./track-buffer";

const TRACK_ENDPOINT = "/api/track";
const OPTOUT_COOKIE = "ds_no_analytics";
const SESSION_KEY = "ds_session";
const FLUSH_INTERVAL_MS = 15_000;
// Cap the visible-text label we read off a clicked element (keeps payloads small + non-PII-ish).
const MAX_LABEL_LEN = 120;

// ---- opt-out / Do-Not-Track ---------------------------------------------

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** True when analytics must be SUPPRESSED: explicit opt-out cookie, navigator DNT, or GPC. */
export function isOptedOut(): boolean {
  if (typeof navigator === "undefined") return true; // not a browser → never track
  const optOut = readCookie(OPTOUT_COOKIE);
  if (optOut && optOut !== "0") return true;
  // navigator.doNotTrack is "1"/"yes" when enabled; some engines expose window.doNotTrack.
  const dnt =
    navigator.doNotTrack ??
    (typeof window !== "undefined"
      ? (window as unknown as { doNotTrack?: string }).doNotTrack
      : undefined);
  if (dnt === "1" || dnt === "yes") return true;
  // Global Privacy Control.
  if ((navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true) {
    return true;
  }
  return false;
}

/**
 * Persist an opt-out preference client-side (first-party cookie, NOT a tracker). Writing "1"
 * turns analytics off; "0" turns it back on. The server reads the same cookie to suppress
 * ingestion (lib/server/analytics-ingest.ts `isAnalyticsOptedOut`). The account-settings
 * toggle ALSO sets this server-side so it survives; this is the client mirror so the running
 * tracker stops immediately. Not httpOnly on purpose — it's a user preference, not a secret.
 */
export function setOptOut(optedOut: boolean): void {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${OPTOUT_COOKIE}=${optedOut ? "1" : "0"}; path=/; max-age=${oneYear}; SameSite=Lax${secure}`;
  if (optedOut) tracker?.disable();
}

// ---- session id ----------------------------------------------------------

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for very old engines — opaque, non-PII.
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** A sessionId that lives for the browsing session (sessionStorage); regenerated per session. */
function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return randomId();
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage can throw (privacy mode / disabled) — fall back to an ephemeral id.
    return randomId();
  }
}

// ---- click-label extraction (NO input values) ----------------------------

/**
 * Derive a non-PII label for a clicked element: prefer an explicit data-track-label, then
 * aria-label, then the element's accessible-ish text (title/alt/trimmed textContent), capped.
 * NEVER reads `.value` of an input/textarea/select — so a typed answer or form field can't leak.
 */
export function describeElement(el: Element): {
  elementType?: string;
  elementLabel?: string;
  metadata?: Record<string, string | number | boolean>;
} {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role") ?? undefined;
  const dataLabel = el.getAttribute("data-track-label") ?? undefined;
  const aria = el.getAttribute("aria-label") ?? undefined;
  const title = (el as HTMLElement).title || undefined;
  const alt = el.getAttribute("alt") ?? undefined;

  // Visible text — but only for non-input controls, and capped. We do NOT touch form values.
  let text: string | undefined;
  if (!["input", "textarea", "select"].includes(tag)) {
    const raw = (el.textContent ?? "").trim().replace(/\s+/g, " ");
    if (raw) text = raw.slice(0, MAX_LABEL_LEN);
  }

  const label = dataLabel || aria || title || alt || text;

  // Collect any data-track-* extras (non-value, author-chosen) into metadata.
  const metadata: Record<string, string | number | boolean> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("data-track-") && attr.name !== "data-track-label") {
      const key = attr.name.replace(/^data-track-/, "").slice(0, 64);
      if (key) metadata[key] = attr.value.slice(0, 120);
    }
  }

  return {
    elementType: role ? `${tag}[${role}]` : tag,
    elementLabel: label ? label.slice(0, MAX_LABEL_LEN) : undefined,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
}

/** Walk up from the event target to the nearest meaningful, trackable element (or null). */
function closestTrackable(target: EventTarget | null): Element | null {
  let node = target as Node | null;
  while (node && node.nodeType !== 1) node = node.parentNode; // climb to an Element
  let el = node as Element | null;
  while (el) {
    const tag = el.tagName.toLowerCase();
    if (
      el.hasAttribute("data-track") ||
      el.hasAttribute("data-track-label") ||
      tag === "a" ||
      tag === "button" ||
      el.getAttribute("role") === "button" ||
      el.getAttribute("role") === "radio" ||
      el.getAttribute("role") === "tab"
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

// ---- the tracker singleton ----------------------------------------------

function currentPath(): string | undefined {
  if (typeof location === "undefined") return undefined;
  return location.pathname + location.search;
}

function viewportString(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.innerWidth}x${window.innerHeight}`;
}

class Tracker {
  private buffer = new TrackBuffer();
  private sessionId = "";
  private disabled = false;
  private started = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private pageEnteredAt = 0;
  private lastPath: string | undefined;
  private onClick = (e: MouseEvent) => this.handleClick(e);
  private onVisibility = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") this.flush(true);
  };
  private onPageHide = () => this.flush(true);

  /** Idempotently start: attach the single delegated click listener + flush triggers + interval. */
  start(): void {
    if (this.started || typeof document === "undefined") return;
    this.started = true;
    this.disabled = isOptedOut();
    this.sessionId = getSessionId();
    if (this.disabled) return; // respect opt-out: attach nothing, send nothing

    document.addEventListener("click", this.onClick, { capture: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pagehide", this.onPageHide);
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  /** Permanently stop tracking for this page life (used when the user opts out at runtime). */
  disable(): void {
    if (this.disabled) return;
    this.disabled = true;
    this.buffer.clear();
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("click", this.onClick, { capture: true } as EventListenerOptions);
      document.removeEventListener("visibilitychange", this.onVisibility);
      window.removeEventListener("pagehide", this.onPageHide);
    }
  }

  /** Public: record an explicit event. No-op when suppressed. */
  track(eventType: string, props: Partial<ClientTrackEvent> = {}): void {
    if (this.disabled || !eventType) return;
    const evt: ClientTrackEvent = {
      eventType,
      path: props.path ?? currentPath(),
      sessionId: this.sessionId,
      viewport: props.viewport ?? viewportString(),
      ...props,
    };
    const flushDue = this.buffer.add(evt);
    if (flushDue) this.flush();
  }

  /**
   * Record a page view for the current route. Emits the time-on-page (durationMs) for the
   * PREVIOUS page first, then marks the new page's entry time. Called by <AnalyticsProvider/>.
   */
  pageView(path?: string): void {
    if (this.disabled) return;
    const now = Date.now();
    // Close out the previous page's time-on-page as its own event.
    if (this.lastPath !== undefined && this.pageEnteredAt > 0) {
      this.buffer.add({
        eventType: "time_on_page",
        path: this.lastPath,
        sessionId: this.sessionId,
        durationMs: Math.max(0, now - this.pageEnteredAt),
      });
    }
    const p = path ?? currentPath();
    this.buffer.add({
      eventType: "page_view",
      path: p,
      referrer: this.lastPath ?? (typeof document !== "undefined" ? document.referrer || undefined : undefined),
      sessionId: this.sessionId,
      viewport: viewportString(),
    });
    this.lastPath = p;
    this.pageEnteredAt = now;
  }

  private handleClick(e: MouseEvent): void {
    if (this.disabled) return;
    const el = closestTrackable(e.target);
    if (!el) return;
    const { elementType, elementLabel, metadata } = describeElement(el);
    const flushDue = this.buffer.add({
      eventType: "click",
      path: currentPath(),
      sessionId: this.sessionId,
      elementType,
      elementLabel,
      metadata,
    });
    if (flushDue) this.flush();
  }

  /**
   * Send pending events. `final=true` (unload/hidden) uses sendBeacon and drains EVERYTHING,
   * chunked under the batch cap. Normal flushes drain one batch and use fetch(keepalive), and
   * re-queue the batch on failure so nothing is lost on a transient error.
   */
  flush(final = false): void {
    if (this.disabled) return;
    if (final) {
      const all = this.buffer.drainAll();
      for (const chunk of chunkEvents(all, DEFAULT_TRACK_BUFFER_CONFIG.maxBatchSize)) {
        this.sendBeacon(chunk);
      }
      return;
    }
    const batch = this.buffer.drain();
    if (batch.length === 0) return;
    this.sendFetch(batch);
  }

  private sendBeacon(events: ClientTrackEvent[]): void {
    if (events.length === 0) return;
    const body = JSON.stringify({ events });
    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" });
        const ok = navigator.sendBeacon(TRACK_ENDPOINT, blob);
        if (ok) return;
      }
    } catch {
      /* fall through to fetch */
    }
    // Beacon unavailable/failed — best-effort keepalive fetch (can't re-queue on unload).
    this.sendFetch(events, true);
  }

  private sendFetch(events: ClientTrackEvent[], unload = false): void {
    if (events.length === 0) return;
    const body = JSON.stringify({ events });
    if (typeof fetch !== "function") return;
    fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      // On a transient failure during NORMAL operation, re-queue so we retry next flush.
      // On unload we can't retry — drop silently (analytics must never block the page).
      if (!unload) this.buffer.requeue(events);
    });
  }
}

// Module-level singleton so every importer shares one buffer + one listener.
let tracker: Tracker | null = null;

function ensureTracker(): Tracker {
  if (!tracker) tracker = new Tracker();
  return tracker;
}

/** Start the tracker (idempotent). Call once from <AnalyticsProvider/> on mount. */
export function initTracker(): void {
  ensureTracker().start();
}

/** Record a route change as a page view (+ closes the previous page's time-on-page). */
export function trackPageView(path?: string): void {
  ensureTracker().pageView(path);
}

/** Record an explicit, named client event with optional non-PII props. */
export function track(eventType: string, props?: Partial<ClientTrackEvent>): void {
  ensureTracker().track(eventType, props);
}

/** Flush pending events now (mostly for tests / explicit teardown). */
export function flushTracker(final = false): void {
  ensureTracker().flush(final);
}
