import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, IBM_Plex_Serif } from "next/font/google";
import { SEO, COPY, PRICE, BANK_B, TOPICS, YEAR, EXAM } from "./copy";

// ── Fonts (module scope; cyrillic subsets verified against font-data.json) ────
// The IBM Plex super-family: a technical-yet-humane instrument face. Sans = the
// terminal UI, Mono = tabular counters / ticket stubs / marginalia, Serif = the
// single warm authoritative moment reserved for the verdict. All three ship
// Cyrillic — required, Ukrainian body copy falls back silently otherwise.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const plexSerif = IBM_Plex_Serif({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
  variable: "--font-serif",
  display: "swap",
});

const CANONICAL = "/lp/v31";

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

// ── JSON-LD @graph (server-rendered) ─────────────────────────────────────────
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
        `${TOPICS} тем`,
        `Симулятор іспиту ${EXAM.questions}/${EXAM.minutes}/${EXAM.maxErrors}`,
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

export default function V31Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${plexSans.variable} ${plexMono.variable} ${plexSerif.variable}`}
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
