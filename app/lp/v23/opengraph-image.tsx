import { ImageResponse } from "next/og";
import { BRAND, STATS } from "./copy";

/* Typographic OG/Twitter share card — the honest ledger headline, 1200×630.
   Lives in the v23 segment so Next wires og:image AND twitter:image (the
   summary_large_image card) automatically. Cyrillic is covered by fetching
   Golos Text (which — unlike the mono face — renders ₴ correctly); if the
   font fetch fails at build/runtime the card still renders in the default
   face, so this never breaks the build. */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${BRAND.name} — чесна відомість ПДР`;

async function loadGolos(weight: number): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Golos+Text:wght@${weight}&subset=cyrillic`,
    { headers: { "User-Agent": "Mozilla/5.0 (compatible; og-image)" } },
  ).then((r) => r.text());
  const url = css.match(/src:\s*url\((.+?)\)\s*format/)?.[1];
  if (!url) throw new Error("golos url not found");
  return fetch(url).then((r) => r.arrayBuffer());
}

const INK = "#22272B";
const MUTED = "#57626A";
const ACCENT = "#0E7A6C";
const BG = "#F4F5F2";
const RULE = "rgba(34,39,43,.16)";

function Row({ label, amount }: { label: string; amount: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        borderTop: `1px solid ${RULE}`,
        padding: "20px 0",
      }}
    >
      <div style={{ fontSize: 34, color: INK, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 34, color: ACCENT, fontWeight: 800 }}>{amount}</div>
    </div>
  );
}

export default async function OgImage() {
  let fonts:
    | { name: string; data: ArrayBuffer; weight: 500 | 800; style: "normal" }[]
    | undefined;
  try {
    const [regular, bold] = await Promise.all([loadGolos(500), loadGolos(800)]);
    fonts = [
      { name: "Golos", data: regular, weight: 500, style: "normal" },
      { name: "Golos", data: bold, weight: 800, style: "normal" },
    ];
  } catch {
    fonts = undefined;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: 72,
          fontFamily: fonts ? "Golos" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 10,
              background: ACCENT,
              color: BG,
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            DS
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: INK, letterSpacing: -1 }}>
            {BRAND.name}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: 48,
            fontSize: 82,
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: -3,
            color: INK,
          }}
        >
          <span>Все, що вони продають —&nbsp;</span>
          <span style={{ color: ACCENT }}>безкоштовно.</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <Row label={`Усі ${STATS.bankCountLabel} офіційні питання`} amount={`0 ${STATS.currency} · назавжди`} />
          <Row label="Доступ до іспиту" amount={`${STATS.priceLabel} ${STATS.currency} · один раз`} />
          <div
            style={{
              display: "flex",
              borderTop: `1px solid ${RULE}`,
              paddingTop: 18,
              marginTop: 4,
              fontSize: 26,
              color: MUTED,
            }}
          >
            Чесна відомість · без зірочок · без підписки
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
