import type { Metadata } from "next";
import { Piazzolla, Manrope } from "next/font/google";
import { SEO, COPY, PRICE, BANK, TOPICS, YEAR } from "./copy";

// ── Fonts (declared locally, module scope; cyrillic subsets verified) ────────
// Display: Piazzolla — sharp contemporary serif with an optical display axis.
// Clinical-editorial, unclaimed by prior territories. Body: Manrope.
const piazzolla = Piazzolla({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const CANONICAL = "/lp/v30";

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

// ── JSON-LD @graph (server-rendered) ────────────────────────────────────────
// WebApplication (free, one Offer) + Organization + WebSite + FAQPage built
// from the SAME faq array that renders the visible accordion.
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
        `${BANK} офіційних питань ПДР`,
        `${TOPICS} тем`,
        "Симулятор іспиту 20/20/2",
        "Калібрована готовність до іспиту (FSRS)",
      ],
    },
    {
      "@type": "Organization",
      name: COPY.brand,
      description: COPY.footer.tagline,
    },
    {
      "@type": "WebSite",
      name: COPY.brand,
      inLanguage: "uk-UA",
    },
    {
      "@type": "FAQPage",
      dateModified: `${YEAR}-01-01`,
      mainEntity: COPY.faq.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export default function V30Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${piazzolla.variable} ${manrope.variable}`}
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
