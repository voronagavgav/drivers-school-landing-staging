/* ═══════════════════════════════════════════════════════════════════════
   v29 «Скептику» — SERVER layout: SEO metadata + JSON-LD @graph.
   Server component (no "use client") so title/description/OG and the
   structured-data script are in the initial HTML. Everything reads the
   same N constants + FAQ array that render the visible page — a bank
   revision or price swap is a one-line bump, never three hand-edited copies.
   ═══════════════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { copy, N } from "./copy";

const TITLE = `Тести ПДР ${N.year} онлайн — тренер готовності до іспиту`; // ≤60
const DESCRIPTION = `Усі ${N.bank} офіційні питання, пояснення й симулятор ${N.examQ}/${N.examMin}/${N.examErr} — безкоштовно. Плати ${N.price} ${N.currency} раз лише за калібрований дил готовності та FSRS-план до дати іспиту.`;

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
      name: "Drivers School — тренер готовності до ПДР",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "uk-UA",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: String(N.price),
        priceCurrency: "UAH",
        category: "one-time",
      },
      publisher: { "@id": "#org" },
    },
    {
      "@type": "FAQPage",
      mainEntity: copy.faq.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    },
  ],
};

export default function V29Layout({ children }: { children: React.ReactNode }) {
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
