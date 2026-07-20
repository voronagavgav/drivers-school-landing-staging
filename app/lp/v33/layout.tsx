import type { Metadata } from "next";
import { Playfair_Display, Spectral, IBM_Plex_Mono } from "next/font/google";
import { SEO, COPY, BANK, YEAR } from "./copy";

// ── Fonts (module scope; cyrillic subsets VERIFIED against Google Fonts metadata) ──
// Display: Playfair Display — high-contrast didone, magazine-editorial. cyrillic ✓
// Body:    Spectral — humanist text serif, superb Ukrainian longform reading. cyrillic ✓
// Apparatus: IBM Plex Mono — footnote markers, section §-marks, labels. cyrillic ✓
// Paired on a contrast axis (didone display vs humanist text serif vs mono apparatus).
const display = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Spectral({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const CANONICAL = "/lp/v33";

export const metadata: Metadata = {
  title: SEO.title,
  description: SEO.description,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: SEO.title,
    description: SEO.description,
    url: CANONICAL,
    locale: "uk_UA",
    type: "article",
    siteName: COPY.brand,
    images: [{ url: "/restyled-live/13_3_0.png", alt: COPY.question.imageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.title,
    description: SEO.description,
    images: ["/restyled-live/13_3_0.png"],
  },
};

// JSON-LD: this page is a teaching Article about one official question.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: COPY.question.text,
      inLanguage: "uk-UA",
      about: "Правила дорожнього руху — зустрічний роз'їзд на спуску",
      articleSection: "Розбір питання ПДР",
      publisher: { "@type": "Organization", name: COPY.brand },
      description: SEO.description,
    },
    {
      "@type": "WebApplication",
      name: COPY.brand,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      featureList: [
        `${BANK} офіційних питань ПДР ${YEAR}`,
        "Розбір до кожного питання",
        "Симулятор іспиту 20/20/2",
      ],
      offers: {
        "@type": "Offer",
        price: "399",
        priceCurrency: "UAH",
        category: "one-time",
      },
    },
  ],
};

export default function V33Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
