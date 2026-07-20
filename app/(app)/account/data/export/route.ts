import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { exportUserData } from "@/lib/server/data-rights";

// GET /account/data/export — a REAL file download of the logged-in user's own data (spec §D).
// A route handler (not a server action) because only a route can set the attachment headers that make
// the browser save a file. `requireUser()` guards it; an unauthenticated request is redirected to
// /login by requireUser itself.

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const user = await requireUser();
  const data = await exportUserData(user.id);
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": 'attachment; filename="drivers-school-export.json"',
      "Cache-Control": "no-store",
    },
  });
}
