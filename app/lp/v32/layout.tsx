import type { Metadata } from "next";
import { Bitter, Golos_Text } from "next/font/google";
import { SEO, COPY, PRICE, BANK, YEAR } from "./copy";

// ── Fonts (module scope; Ukrainian coverage verified against the Google Fonts
// CSS API — Bitter carries cyrillic + cyrillic-ext (U+0490-0491 = ґ), Golos
// Text is a native-Cyrillic grotesque). Pair on a contrast axis:
// printerly slab display + neutral documentary grotesque for folios/captions.
const bitter = Bitter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const golos = Golos_Text({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const CANONICAL = "/lp/v32";

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

// JSON-LD @graph — a free WebApplication (one Offer) + the catalogue as a
// Collection sized by the real published count.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: COPY.brand,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      inLanguage: "uk-UA",
      description: SEO.description,
      offers: {
        "@type": "Offer",
        price: String(PRICE),
        priceCurrency: "UAH",
        category: "one-time",
      },
      featureList: [
        `${BANK.total} офіційних питань ПДР (категорія B)`,
        `${BANK.sections} розділів`,
        `Симулятор іспиту 20/20/2`,
        `Зображення до питань`,
      ],
    },
    {
      "@type": "Collection",
      name: SEO.title,
      inLanguage: "uk-UA",
      dateModified: `${YEAR}-01-01`,
    },
  ],
};

export default function V32Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${bitter.variable} ${golos.variable}`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
