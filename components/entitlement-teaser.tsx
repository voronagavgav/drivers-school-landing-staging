import Link from "next/link";
import { Card } from "@/components/ui";

// Reusable locked-state teaser (spec T2 §6). PRESENTATIONAL ONLY — plain props, no imports from any
// server-graph module (data/auth/rbac helpers stay out). wave16-08 decides WHERE this mounts; it is
// mounted NOWHERE in this task.
//
// It shows a locked readiness detail as a BLURRED placeholder block (CSS blur on a decorative
// placeholder — never real data behind the frost), one line of value copy, and a quiet link to
// /pricing. Calm tone: zero urgency/scarcity words, no timers, no «останній шанс».

export function EntitlementTeaser({
  title,
  valueLine,
}: {
  title: string;
  valueLine: string;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>

      {/* Obscured placeholder — a blurred decorative block, NOT real data. */}
      <div
        aria-hidden
        className="relative overflow-hidden rounded-card border border-line"
      >
        <div className="space-y-2 p-4 blur-sm select-none">
          <div className="h-3 w-3/4 rounded-full bg-green-soft/60" />
          <div className="h-3 w-1/2 rounded-full bg-green-soft/50" />
          <div className="h-3 w-2/3 rounded-full bg-green-soft/40" />
        </div>
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-2xl">
          🔒
        </span>
      </div>

      <p className="text-sm text-muted">{valueLine}</p>

      <Link
        href="/pricing"
        className="text-sm font-medium text-green-deep underline-offset-2 hover:underline"
      >
        Відкрити доступ
      </Link>
    </Card>
  );
}
