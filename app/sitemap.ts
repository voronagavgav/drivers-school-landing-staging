import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { indexingEnabled, publicOrigin } from "@/lib/seo";

// Sitemap (spec T5, wave16-14). Gate 0 ships CLOSED: with `APP_ORIGIN` unset, `indexingEnabled()` is
// false, so the sitemap carries ONLY the static entries (the landing `/`) and NO `/q/<key>` question
// URLs — the default build advertises nothing to crawlers. When Gate 0 opens (a public origin is
// configured), every servable public question (`isPublished && isActive && archivedAt === null` with a
// `questionKey`, matching the public-question loader's access boundary) is listed.
//
// Base URL falls back to `http://localhost:3000` only when the gate is closed — and the closed sitemap
// has no question URLs anyway, so the placeholder host never appears in a real (open-gate) `/q/` loc.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicOrigin() ?? "http://localhost:3000";

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly" },
    { url: `${base}/terms`, changeFrequency: "yearly" },
    { url: `${base}/privacy`, changeFrequency: "yearly" },
    { url: `${base}/support`, changeFrequency: "monthly" },
    { url: `${base}/contact`, changeFrequency: "yearly" },
    { url: `${base}/source`, changeFrequency: "monthly" },
  ];

  if (indexingEnabled()) {
    const questions = await prisma.question.findMany({
      where: {
        isPublished: true,
        isActive: true,
        archivedAt: null,
        questionKey: { not: null },
      },
      select: { questionKey: true },
    });

    for (const { questionKey } of questions) {
      if (questionKey == null) continue;
      entries.push({
        url: `${base}/q/${questionKey}`,
        changeFrequency: "monthly",
      });
    }
  }

  return entries;
}
