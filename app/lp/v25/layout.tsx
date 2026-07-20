import type { Metadata } from "next";
import { Tektur, Manrope } from "next/font/google";
import { STATS, FAQ } from "./copy";

// Inherited from v14 «Пік форми». Display: Tektur (squared, athletic-technical, cyrillic verified).
// Body: Manrope (cyrillic verified). Pair on a contrast axis (mechanical display + humanist body).
const tektur = Tektur({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const TITLE = "Тести ПДР 2026 онлайн — тренер готовності до іспиту";
const DESCRIPTION =
  "Як працює тренер готовності: калібрований показник P(скласти), FSRS-план до дати іспиту та чесне калібрування. Усі офіційні питання й симулятор — безкоштовно.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    locale: "uk_UA",
    type: "website",
    siteName: "Drivers School",
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
      name: "Drivers School",
      description: "Тренер готовності до теоретичного іспиту ПДР.",
    },
    {
      "@type": "WebSite",
      name: "Drivers School",
      inLanguage: "uk-UA",
    },
    {
      "@type": "WebApplication",
      name: "Drivers School",
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

export default function V25Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${tektur.variable} ${manrope.variable}`}
      style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
