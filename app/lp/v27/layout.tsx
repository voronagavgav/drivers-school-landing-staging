import type { Metadata } from "next";
import { copy, N } from "./copy";

// Server layer: SEO surfaces rendered in initial HTML. Both hero A/B variants
// share this title / description / JSON-LD — variant assignment never forks the
// SEO surface (no cloaking-pattern divergence). All numbers read from N.

const TITLE = `Тести ПДР ${N.year} — тренер готовності до іспиту`;
const DESCRIPTION = `Пройди ранок іспиту з ПДР спокійно: ${N.bank} офіційні питання, симулятор ${N.examQ}/${N.examMin}/${N.examMaxErrors} і калібрований показник готовності до твоєї дати. Усе для навчання — безкоштовно.`;

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
      description: "Навчальна платформа для підготовки до теоретичного іспиту з ПДР.",
    },
    {
      "@type": "WebSite",
      "@id": "#site",
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
      description: DESCRIPTION,
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

export default function V27Layout({ children }: { children: React.ReactNode }) {
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
