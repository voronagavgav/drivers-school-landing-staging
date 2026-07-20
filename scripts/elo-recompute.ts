import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { recomputeElo } from "../lib/server/elo";

// ---------------------------------------------------------------------------
// Manual on-box Elo/Rasch item-difficulty recompute (Wave 22, wave22-08).
//
// Standalone Prisma client with the libsql adapter — this script runs under tsx,
// NOT Next, so it must NOT import the app's shared db module (which pulls in
// `server-only`). It owns its own client exactly like scripts/nightly-readiness.ts
// and PASSES it into the wave22-07 `recomputeElo`, so the manual path is the SAME
// code as the nightly path — no duplicated / divergent recompute math.
//
// `recomputeElo` is `server-only`-tainted (via lib/server/elo), so this runs under
// `tsx --conditions=react-server` (see ops/README), which resolves the marker to
// its empty stub instead of throwing outside a server runtime.
//
// Chunking / writeback (≤200-id batches, P2029 safety) lives entirely inside
// `recomputeElo` — this script only wires it and logs a summary line.
// ---------------------------------------------------------------------------

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

async function main() {
  const { answersFolded, itemsWritten } = await recomputeElo(prisma);
  // Exactly ONE greppable summary line: the label `elo recompute` + the counts.
  console.log(
    `elo recompute: folded ${answersFolded} answer(s), wrote ${itemsWritten} item(s)`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("elo recompute: FAILED", err);
    await prisma.$disconnect();
    process.exit(1);
  });
