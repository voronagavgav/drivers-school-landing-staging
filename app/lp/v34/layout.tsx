import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { SEO, COPY, PRICE, BANK_B, SECTIONS, YEAR } from "./copy";

// ── Font (module scope) ───────────────────────────────────────────────────────
// Manrope — a warm, friendly geometric-humanist sans with a COMPLETE Cyrillic
// set (Ukrainian body copy falls back silently otherwise, a known defect). One
// family carrying the whole page through weight/size contrast, per the single-
// family brand doctrine; warmth is carried by the palette + real imagery, not by
// a second face. Display weight = 800/700, body = 400/500/600.
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const CANONICAL = "/lp/v34";

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

export default function V34Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={manrope.variable}
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
