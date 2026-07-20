import { describe, it, expect } from "vitest";
import {
  TrackBuffer,
  chunkEvents,
  DEFAULT_TRACK_BUFFER_CONFIG,
  type ClientTrackEvent,
} from "@/lib/client/track-buffer";

const ev = (eventType: string): ClientTrackEvent => ({ eventType });

describe("TrackBuffer.add / flush-due signal", () => {
  it("starts empty", () => {
    const b = new TrackBuffer();
    expect(b.isEmpty).toBe(true);
    expect(b.size).toBe(0);
  });

  it("returns false until the queue reaches maxBatchSize, then true", () => {
    const b = new TrackBuffer({ maxBatchSize: 3, maxQueueSize: 100 });
    expect(b.add(ev("a"))).toBe(false); // 1
    expect(b.add(ev("b"))).toBe(false); // 2
    expect(b.add(ev("c"))).toBe(true); // 3 → flush due
    expect(b.size).toBe(3);
  });

  it("keeps signalling flush-due while the queue stays at/over the batch size", () => {
    const b = new TrackBuffer({ maxBatchSize: 2, maxQueueSize: 100 });
    b.add(ev("a"));
    expect(b.add(ev("b"))).toBe(true);
    expect(b.add(ev("c"))).toBe(true);
  });
});

describe("TrackBuffer.drain", () => {
  it("removes and returns up to one batch of the OLDEST events (FIFO)", () => {
    const b = new TrackBuffer({ maxBatchSize: 2, maxQueueSize: 100 });
    b.add(ev("a"));
    b.add(ev("b"));
    b.add(ev("c"));
    const first = b.drain();
    expect(first.map((e) => e.eventType)).toEqual(["a", "b"]);
    expect(b.size).toBe(1);
    const second = b.drain();
    expect(second.map((e) => e.eventType)).toEqual(["c"]);
    expect(b.isEmpty).toBe(true);
  });

  it("returns [] when empty", () => {
    expect(new TrackBuffer().drain()).toEqual([]);
  });
});

describe("TrackBuffer.drainAll", () => {
  it("returns and removes EVERYTHING regardless of batch size", () => {
    const b = new TrackBuffer({ maxBatchSize: 2, maxQueueSize: 100 });
    for (const t of ["a", "b", "c", "d", "e"]) b.add(ev(t));
    const all = b.drainAll();
    expect(all.map((e) => e.eventType)).toEqual(["a", "b", "c", "d", "e"]);
    expect(b.isEmpty).toBe(true);
  });

  it("returns [] when empty", () => {
    expect(new TrackBuffer().drainAll()).toEqual([]);
  });
});

describe("TrackBuffer.requeue", () => {
  it("puts a failed batch back at the FRONT, preserving overall order", () => {
    const b = new TrackBuffer({ maxBatchSize: 2, maxQueueSize: 100 });
    b.add(ev("c"));
    b.add(ev("d"));
    // a failed send of [a,b] is requeued ahead of the still-pending [c,d]
    b.requeue([ev("a"), ev("b")]);
    expect(b.drainAll().map((e) => e.eventType)).toEqual(["a", "b", "c", "d"]);
  });

  it("is a no-op for an empty batch", () => {
    const b = new TrackBuffer();
    b.add(ev("a"));
    b.requeue([]);
    expect(b.size).toBe(1);
  });
});

describe("TrackBuffer bounded memory (maxQueueSize)", () => {
  it("drops the OLDEST events once the queue is full (keeps the most recent)", () => {
    const b = new TrackBuffer({ maxBatchSize: 100, maxQueueSize: 3 });
    b.add(ev("a"));
    b.add(ev("b"));
    b.add(ev("c"));
    b.add(ev("d")); // overflows → "a" dropped
    expect(b.size).toBe(3);
    expect(b.drainAll().map((e) => e.eventType)).toEqual(["b", "c", "d"]);
  });

  it("requeue trims the OLDEST overflow rather than exceeding the cap", () => {
    const b = new TrackBuffer({ maxBatchSize: 100, maxQueueSize: 3 });
    b.add(ev("x"));
    b.add(ev("y"));
    // requeue 3 in front of [x,y] = 5 total, cap 3 → keep the last 3 in order
    b.requeue([ev("a"), ev("b"), ev("c")]);
    expect(b.size).toBe(3);
    expect(b.drainAll().map((e) => e.eventType)).toEqual(["c", "x", "y"]);
  });
});

describe("TrackBuffer.clear", () => {
  it("discards all pending events (opt-out path)", () => {
    const b = new TrackBuffer();
    b.add(ev("a"));
    b.add(ev("b"));
    b.clear();
    expect(b.isEmpty).toBe(true);
  });
});

describe("chunkEvents", () => {
  it("splits into chunks no larger than the batch size", () => {
    const events = ["a", "b", "c", "d", "e"].map(ev);
    expect(chunkEvents(events, 2).map((c) => c.length)).toEqual([2, 2, 1]);
  });

  it("returns a single chunk when everything fits", () => {
    const events = ["a", "b"].map(ev);
    expect(chunkEvents(events, 10)).toEqual([events]);
  });

  it("returns [] for no events", () => {
    expect(chunkEvents([], 10)).toEqual([]);
  });

  it("never produces a chunk larger than the server batch cap when using the default", () => {
    const many = Array.from({ length: DEFAULT_TRACK_BUFFER_CONFIG.maxBatchSize * 3 + 1 }, (_, i) =>
      ev(`e${i}`),
    );
    const chunks = chunkEvents(many, DEFAULT_TRACK_BUFFER_CONFIG.maxBatchSize);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(DEFAULT_TRACK_BUFFER_CONFIG.maxBatchSize);
  });
});

describe("default config stays under the server batch cap", () => {
  it("auto-flush batch size is <= the server TRACK_MAX_BATCH_SIZE (50)", () => {
    // The server rejects (not truncates) a batch over 50; the client must never auto-build one bigger.
    expect(DEFAULT_TRACK_BUFFER_CONFIG.maxBatchSize).toBeLessThanOrEqual(50);
  });
});
