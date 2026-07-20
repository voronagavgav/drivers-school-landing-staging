import type { Metadata } from "next";
import { Rubik, Golos_Text } from "next/font/google";
import { SEO, COPY, PRICE, BANK_B, SECTIONS, YEAR } from "./copy";

// ── Fonts (module scope) ──────────────────────────────────────────────────────
// Rubik — a rounded, buoyant geometric sans with a COMPLETE Cyrillic set; the
// "app-marketing" display voice, adult not childish. Golos Text — a humanist
// grotesque (also Cyrillic-complete) for body copy: paired on a contrast axis
// (geometric-rounded display + humanist body), never two lookalikes. Neither is
// Manrope (v34) nor Lexend — this variant's type is its own.
const rubik = Rubik({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const CANONICAL = "/lp/v36";

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

export default function V36Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${rubik.variable} ${golos.variable}`} style={{ fontFamily: "var(--font-body)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
