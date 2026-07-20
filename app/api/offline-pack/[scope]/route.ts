import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOfflinePack } from "@/lib/server/offline-pack";

// Offline-pack data endpoint (spec §E, backend half). Thin auth wrapper over
// `lib/server/offline-pack` — all scope resolution / DB orchestration lives
// there (house split). Identity comes from the session cookie ONLY; the
// `[scope]` segment is a Topic id or one of the "mistakes"/"saved" literals,
// anything else 404s. Packs are fetched by client code and stored in
// IndexedDB; the service worker never caches this route (JSON freshness
// matters), so no long-lived Cache-Control here.
//
// Node runtime: the size estimate stats real files on disk.

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ scope: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { scope } = await params;
  const pack = await getOfflinePack(user.id, scope);
  if (!pack) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json(pack);
}
