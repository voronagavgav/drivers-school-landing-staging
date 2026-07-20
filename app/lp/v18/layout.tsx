import type { Metadata } from "next";
import { Cuprum, Anonymous_Pro } from "next/font/google";
import { STATS, FAQ, HERO } from "./copy";

// Display + body: Cuprum (ParaType, cyrillic-native, condensed and form-like).
const cuprum = Cuprum({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cuprum",
  display: "swap",
});

// Form-field labels, marginalia, stamp text: Anonymous Pro (typewriter, cyrillic verified).
const anon = Anonymous_Pro({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-anon",
  display: "swap",
});

const TITLE = "Тести ПДР онлайн 2026 — офіційні питання і тренер готовності | Drivers School";
const DESCRIPTION = `${STATS.bankCount} офіційних питань, пояснення та симулятор іспиту (${STATS.examQuestions} питань · ${STATS.examMinutes} хвилин · ${STATS.examMaxErrors} помилки) — безкоштовно, без реєстрації. Тренер, який рахує твою готовність до іспиту.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/lp/v18" },
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

const activeHeadline = HERO.activeHeadline === "A" ? HERO.headlineA : HERO.headlineB;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "#org",
      name: "Drivers School",
      description: "Тренер готовності до теоретичного іспиту ПДР.",
    },
    {
      "@type": "WebSite",
      "@id": "#website",
      name: "Drivers School",
      inLanguage: "uk-UA",
      publisher: { "@id": "#org" },
    },
    {
      "@type": "WebApplication",
      name: "Drivers School",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "uk-UA",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: STATS.price,
        priceCurrency: "UAH",
        description: "Доступ до іспиту — один разовий платіж, не підписка.",
      },
    },
    {
      "@type": "WebPage",
      name: activeHeadline,
      inLanguage: "uk-UA",
      isPartOf: { "@id": "#website" },
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

export default function V18Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${cuprum.variable} ${anon.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
