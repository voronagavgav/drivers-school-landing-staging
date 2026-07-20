import type { Metadata } from "next";
import { copy } from "./copy";

const TITLE = "Тести ПДР 2026 — офіційні питання та тренер готовності | Drivers School";
const DESCRIPTION =
  "2322 офіційні питання, пояснення та симулятор іспиту (20 питань · 20 хвилин · 2 помилки) — безкоштовно, без реєстрації. Тренер, що рахує твою готовність до іспиту.";
const URL = "https://drivers.school/lp/v20";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: URL,
    siteName: copy.brand,
    title: TITLE,
    description: DESCRIPTION,
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
      "@id": "https://drivers.school/#org",
      name: copy.brand,
      url: "https://drivers.school",
    },
    {
      "@type": "WebSite",
      "@id": "https://drivers.school/#website",
      url: "https://drivers.school",
      name: copy.brand,
      inLanguage: "uk",
      publisher: { "@id": "https://drivers.school/#org" },
    },
    {
      "@type": "WebApplication",
      "@id": `${URL}#app`,
      name: copy.brand,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "uk",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "399",
        priceCurrency: "UAH",
        category: "one-time",
        description: "Доступ до іспиту — одноразовий платіж, не підписка.",
      },
    },
    {
      "@type": "WebPage",
      "@id": `${URL}#webpage`,
      url: URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "uk",
      isPartOf: { "@id": "https://drivers.school/#website" },
    },
    {
      "@type": "FAQPage",
      "@id": `${URL}#faq`,
      mainEntity: copy.faq.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    },
  ],
};

export default function V20Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
