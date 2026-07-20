import type { Metadata } from "next";
import { Onest } from "next/font/google";
import { SEO, COPY, PRICE, BANK_B, SECTIONS, YEAR } from "./copy";

// ── Font (module scope) ───────────────────────────────────────────────────────
// Onest — a calm, tightly-drawn contemporary grotesk with a COMPLETE Cyrillic
// set (subsets include "cyrillic", so Ukrainian body + display copy resolve
// natively, not via a fallback face). Deliberately NOT Manrope (v34) and NOT
// the Inter/Lexend reflex defaults. One family carries the whole page through
// weight/size/tracking contrast — the concept's "restrained everything-else so
// the gradient + bento carry the luxury". Display = 700/800, body = 400/500/600.
const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-onest",
  display: "swap",
});

const CANONICAL = "/lp/v35";

export const metadata: Metadata = {
  title: SEO.title,
  description: SEO.description,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: SEO.title,
    description: SEO.description,
    url: CANONICAL,
    locale: "uk_UA",
    type: "website",
    siteName: COPY.brand,
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.title,
    description: SEO.description,
  },
};

// ── JSON-LD @graph (server-rendered) ──────────────────────────────────────────
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: COPY.brand,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description: SEO.description,
      offers: {
        "@type": "Offer",
        price: String(PRICE),
        priceCurrency: "UAH",
        category: "one-time",
      },
      featureList: [
        `${BANK_B} офіційних питань категорії B`,
        `${SECTIONS} розділів`,
        "Симулятор іспиту 20/20/2",
      ],
    },
    {
      "@type": "Organization",
      name: COPY.brand,
      description: "Навчальний застосунок для підготовки до теоретичного іспиту ПДР",
    },
    {
      "@type": "WebSite",
      name: COPY.brand,
      inLanguage: "uk-UA",
      copyrightYear: YEAR,
    },
  ],
};

export default function V35Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={onest.variable} style={{ fontFamily: "var(--font-onest)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
