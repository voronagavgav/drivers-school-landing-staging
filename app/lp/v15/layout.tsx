import type { Metadata } from "next";
import { Jost, PT_Serif } from "next/font/google";
import { STATS, FAQ, PRICING } from "./copy";

// Display: Jost 700 — geometric, knife-cut edges (cyrillic verified).
const jost = Jost({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jost",
  display: "swap",
});

// Body: PT Serif 400 — bookish warmth; true serif/geometric-sans contrast axis.
const ptSerif = PT_Serif({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-ptserif",
  display: "swap",
});

const TITLE = "Тести ПДР 2026 онлайн — тренер готовності до іспиту";
const DESCRIPTION =
  "Усі офіційні питання ПДР 2026 безкоштовно: пояснення, зображення, симулятор іспиту. Дізнайся, чи ти справді готовий скласти з першої спроби.";

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
      isAccessibleForFree: true,
      inLanguage: "uk-UA",
      offers: {
        "@type": "Offer",
        price: STATS.price,
        priceCurrency: "UAH",
        category: "one-time",
        description: PRICING.priceNote,
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

export default function V15Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${jost.variable} ${ptSerif.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
