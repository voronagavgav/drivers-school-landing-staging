// ---------------------------------------------------------------------------
// PURE client-side batching core for the first-party analytics tracker.
//
// No DOM, no timers, no navigator, no fetch — just the queue/flush bookkeeping.
// This is the piece worth unit-testing (the browser glue in ./track.ts wires it
// to listeners + sendBeacon). Keeping it runtime-agnostic lets it run in the
// `node` vitest env with no jsdom.
//
// PRIVACY: this buffer only ever holds the WHITELISTED, non-PII fields the
// server ingest accepts (see lib/analytics-ingest.ts `trackEventSchema`). It is
// the client's job NOT to enqueue input values / PII in the first place; the
// server zod schema is the backstop that strips anything extra.
// ---------------------------------------------------------------------------

// One queued client event. Mirrors the server `trackEventSchema` whitelist — only
// these keys exist, so an input value can never be carried unless a caller adds it
// (and even then the server would strip an unknown key). Everything but the type
// is optional.
export interface ClientTrackEvent {
  eventType: string;
  path?: string;
  referrer?: string;
  elementType?: string;
  /** A human label / aria-label / data-track value — NEVER a raw input value. */
  elementLabel?: string;
  sessionId?: string;
  viewport?: string;
  durationMs?: number;
  /** Small freeform record of primitive extras (never form values). */
  metadata?: Record<string, string | number | boolean>;
}

export interface TrackBufferConfig {
  /** Flush automatically once the queue reaches this many events. */
  maxBatchSize: number;
  /** Hard cap on the queue; once reached, the OLDEST events are dropped to bound memory. */
  maxQueueSize: number;
}

export const DEFAULT_TRACK_BUFFER_CONFIG: TrackBufferConfig = {
  // Stay well under the server's TRACK_MAX_BATCH_SIZE (50) so a flush is never rejected for size.
  maxBatchSize: 20,
  // If the network is down for a while, don't grow without bound — keep the most recent events.
  maxQueueSize: 200,
};

/**
 * A pure FIFO buffer of pending analytics events with size-based auto-flush signalling.
 *
 * It does NO I/O: `add` returns whether a flush is now due (queue hit `maxBatchSize`), and
 * `drain` hands back up to one batch worth of events and removes them from the queue. The
 * browser layer decides WHEN to actually send (interval / visibilitychange / beforeunload)
 * and re-queues a failed batch via `requeue`.
 */
export class TrackBuffer {
  private queue: ClientTrackEvent[] = [];
  private readonly config: TrackBufferConfig;

  constructor(config: Partial<TrackBufferConfig> = {}) {
    this.config = { ...DEFAULT_TRACK_BUFFER_CONFIG, ...config };
  }

  /**
   * Enqueue one event. Returns true when a flush is now DUE (the queue has reached the batch
   * size). If the queue is already at `maxQueueSize`, the OLDEST event is dropped first so a
   * stalled sender can't leak memory (recent activity is more valuable than ancient).
   */
  add(event: ClientTrackEvent): boolean {
    if (this.queue.length >= this.config.maxQueueSize) {
      // drop oldest to make room (bounded memory; never throw on a hot path)
      this.queue.shift();
    }
    this.queue.push(event);
    return this.queue.length >= this.config.maxBatchSize;
  }

  /** Number of pending events. */
  get size(): number {
    return this.queue.length;
  }

  /** True iff there is nothing to send. */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Remove and return up to one batch (`maxBatchSize`) of the oldest events. Returns [] when
   * empty. The caller sends these; on failure it should `requeue` them so they aren't lost.
   */
  drain(): ClientTrackEvent[] {
    if (this.queue.length === 0) return [];
    return this.queue.splice(0, this.config.maxBatchSize);
  }

  /**
   * Remove and return ALL pending events as a single array (no batch cap). Used on the final
   * unload flush, where one sendBeacon call must carry everything still queued. The caller is
   * responsible for not exceeding the server batch cap (the browser layer chunks if needed).
   */
  drainAll(): ClientTrackEvent[] {
    if (this.queue.length === 0) return [];
    return this.queue.splice(0, this.queue.length);
  }

  /**
   * Put a failed batch back at the FRONT of the queue (preserving order) so a transient send
   * failure doesn't lose events. Honours `maxQueueSize` by trimming the OLDEST overflow.
   */
  requeue(events: ClientTrackEvent[]): void {
    if (events.length === 0) return;
    this.queue = events.concat(this.queue);
    if (this.queue.length > this.config.maxQueueSize) {
      this.queue = this.queue.slice(this.queue.length - this.config.maxQueueSize);
    }
  }

  /** Discard everything (e.g. after the user opts out). */
  clear(): void {
    this.queue = [];
  }
}

/**
 * Split a list of events into chunks no larger than `maxBatchSize`. Used by the unload path,
 * where `drainAll` may return more than one batch worth — each chunk becomes one POST so the
 * server never rejects a batch for being too big.
 */
export function chunkEvents(events: ClientTrackEvent[], maxBatchSize: number): ClientTrackEvent[][] {
  if (maxBatchSize <= 0) return events.length ? [events] : [];
  const chunks: ClientTrackEvent[][] = [];
  for (let i = 0; i < events.length; i += maxBatchSize) {
    chunks.push(events.slice(i, i + maxBatchSize));
  }
  return chunks;
}
