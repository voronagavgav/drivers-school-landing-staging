import type { Metadata } from "next";
import { Piazzolla, Nunito_Sans } from "next/font/google";
import { STATS, FAQ, BRAND } from "./copy";

/* Display: Piazzolla 500–700 — a variable book-serif with optical-size warmth,
   human not editorial-didone; cyrillic + cyrillic-ext verified in the font data.
   Body: Nunito Sans — soft humanist sans, a true serif/humanist contrast axis.
   Both declared LOCALLY at module scope (never edit the global stylesheet). */
const piazzolla = Piazzolla({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const TITLE =
  "Тести ПДР онлайн 2026 — офіційні питання і тренер готовності | Drivers School";
const DESCRIPTION =
  "2322 офіційних питання, пояснення та симулятор іспиту (20 питань · 20 хвилин · 2 помилки) — безкоштовно, без реєстрації. Тренер, що рахує твою готовність до іспиту.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    locale: "uk_UA",
    type: "website",
    siteName: BRAND.name,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: BRAND.name,
      description: "Тренер готовності до теоретичного іспиту ПДР.",
    },
    {
      "@type": "WebSite",
      name: BRAND.name,
      inLanguage: "uk-UA",
    },
    {
      "@type": "WebApplication",
      name: BRAND.name,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      inLanguage: "uk-UA",
      offers: {
        "@type": "Offer",
        price: STATS.price,
        priceCurrency: "UAH",
        category: "one-time",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    },
  ],
};

export default function V19Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${piazzolla.variable} ${nunitoSans.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
