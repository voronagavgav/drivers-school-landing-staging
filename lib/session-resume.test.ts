import { describe, it, expect } from "vitest";
import { selectResumableSession } from "@/lib/session-resume";

describe("selectResumableSession", () => {
  it("(a) returns null for an empty list", () => {
    expect(selectResumableSession([])).toBeNull();
  });

  it("(b) returns null when no session is IN_PROGRESS", () => {
    const sessions = [
      { id: "s1", status: "COMPLETED", startedAt: 100 },
      { id: "s2", status: "ABANDONED", startedAt: 200 },
    ];
    expect(selectResumableSession(sessions)).toBeNull();
  });

  it("(c) returns the IN_PROGRESS session with the latest startedAt", () => {
    const sessions = [
      { id: "old", status: "IN_PROGRESS", startedAt: 100 },
      { id: "new", status: "IN_PROGRESS", startedAt: 300 },
      { id: "mid", status: "IN_PROGRESS", startedAt: 200 },
    ];
    expect(selectResumableSession(sessions)?.id).toBe("new");
  });

  it("(d) ignores COMPLETED/ABANDONED sessions in a mixed list", () => {
    const sessions = [
      { id: "done", status: "COMPLETED", startedAt: 500 },
      { id: "gone", status: "ABANDONED", startedAt: 400 },
      { id: "live", status: "IN_PROGRESS", startedAt: 200 },
    ];
    expect(selectResumableSession(sessions)?.id).toBe("live");
  });

  it("compares Date and epoch-ms startedAt values equivalently", () => {
    const sessions = [
      { id: "earlier", status: "IN_PROGRESS", startedAt: new Date(1000) },
      { id: "later", status: "IN_PROGRESS", startedAt: 2000 },
    ];
    expect(selectResumableSession(sessions)?.id).toBe("later");
  });
});
