import type { MetadataRoute } from "next";

// Colors are hex literals copied from the app tokens in app/globals.css :root —
// theme_color = --color-field (#FBFAF7, warm off-white page field; spec P1.7 — the
// install/OS chrome tint matches the app surface, not the green accent), and
// background_color = --color-field (#FBFAF7) so the splash matches the page field.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Drivers School — підготовка до іспиту з ПДР",
    short_name: "ПДР Школа",
    description:
      "Платформа для підготовки до теоретичної частини іспиту з Правил дорожнього руху.",
    lang: "uk",
    display: "standalone",
    start_url: "/dashboard",
    categories: ["education"],
    theme_color: "#FBFAF7",
    background_color: "#FBFAF7",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
