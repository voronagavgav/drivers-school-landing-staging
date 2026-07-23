import { ImageResponse } from "next/og";

export const alt =
  "Drivers School — персональний маршрут підготовки до теоретичного іспиту";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#242330",
        color: "#f7f3f6",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          opacity: 0.16,
          backgroundImage:
            "linear-gradient(rgba(247,192,238,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(247,192,238,.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          right: -90,
          top: -120,
          display: "flex",
          border: "2px solid rgba(247,192,238,.28)",
          borderRadius: 999,
        }}
      />
      <div
        style={{
          width: "100%",
          padding: "64px 72px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: "#f0aee6",
              color: "#242330",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            DS
          </div>
          <div style={{ display: "flex", fontSize: 25, fontWeight: 600 }}>
            Drivers School
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              maxWidth: 890,
              display: "flex",
              fontSize: 68,
              lineHeight: 1.06,
              letterSpacing: "-2.4px",
              fontWeight: 650,
            }}
          >
            Теорія, яка знає, що вам повторити.
          </div>
          <div
            style={{
              maxWidth: 760,
              display: "flex",
              color: "#c7c2cd",
              fontSize: 27,
              lineHeight: 1.4,
            }}
          >
            Персональний маршрут, розумне повторення і доказова готовність до
            іспиту.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(247,192,238,.24)",
            paddingTop: 24,
            color: "#fad8f4",
            fontSize: 20,
          }}
        >
          <div style={{ display: "flex" }}>1 757 питань категорії B</div>
          <div style={{ display: "flex" }}>20 питань · 20 хвилин · до 2 помилок</div>
        </div>
      </div>
    </div>,
    size,
  );
}
