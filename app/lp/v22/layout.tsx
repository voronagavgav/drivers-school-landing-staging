import type { Metadata } from "next";
import { Alegreya, Alegreya_Sans } from "next/font/google";
import { STATS, FAQ, BRAND } from "./copy";

/* Display: Alegreya (book serif for night reading, cyrillic verified).
   Body: Alegreya Sans — true serif/sans contrast axis of one superfamily.
   Inherited faithfully from v13 «Опівночі». */
const alegreya = Alegreya({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const alegreyaSans = Alegreya_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
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

export default function V22Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${alegreya.variable} ${alegreyaSans.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
