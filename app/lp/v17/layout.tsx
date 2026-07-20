import type { Metadata } from "next";
import { copy } from "./copy";

// SEO — Ukrainian keyword-led, year-stamped. One <h1> lives in page.tsx (the hero question).
const N_QUESTIONS = "2322";
const PRICE = "399";

export const metadata: Metadata = {
  title: "Тести ПДР онлайн 2026 — офіційні питання і тренер готовності | Drivers School",
  description:
    `${N_QUESTIONS} офіційних питань, пояснення та симулятор іспиту (20 питань · 20 хвилин · 2 помилки) — безкоштовно, без реєстрації. Тренер, який рахує твою готовність до іспиту.`,
  alternates: { canonical: "/lp/v17" },
  openGraph: {
    title: "Тести ПДР онлайн 2026 — офіційні питання і тренер готовності",
    description:
      `${N_QUESTIONS} офіційних питань, пояснення та симулятор іспиту — безкоштовно, без реєстрації. Тренер, який рахує твою готовність до іспиту.`,
    locale: "uk_UA",
    type: "website",
    siteName: "Drivers School",
  },
  twitter: {
    card: "summary_large_image",
    title: "Тести ПДР онлайн 2026 — тренер готовності",
    description:
      `${N_QUESTIONS} офіційних питань, пояснення та симулятор іспиту — безкоштовно. Тренер, який рахує твою готовність.`,
  },
};

export default function V17Layout({ children }: { children: React.ReactNode }) {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "#org",
        name: "Drivers School",
        description: "Тренер готовності до теоретичного іспиту з ПДР.",
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
        name: "Drivers School — тренер готовності до іспиту ПДР",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: "uk-UA",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: PRICE,
          priceCurrency: "UAH",
          category: "one-time",
        },
      },
      {
        "@type": "FAQPage",
        "@id": "#faq",
        mainEntity: copy.faq.items.map((it) => ({
          "@type": "Question",
          name: it.q,
          acceptedAnswer: { "@type": "Answer", text: it.a },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />
      {children}
    </>
  );
}
