import type { Metadata } from "next";
import { STATS, copy } from "./copy";

const TITLE = "Тести ПДР 2026 онлайн — план до іспиту та готовність";
const DESCRIPTION =
  "Назви дату іспиту — і отримай план до неї. Усі офіційні питання ПДР 2026 безкоштовно: пояснення, зображення, симулятор. Дізнайся, чи справді готовий скласти з першої спроби.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/lp/v21" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "uk_UA",
    siteName: copy.brand,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

/** JSON-LD @graph — Organization · WebSite · WebApplication (+ one Offer) · FAQPage. */
function JsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "#org",
        name: copy.brand,
        description: copy.footer.tagline,
      },
      {
        "@type": "WebSite",
        "@id": "#website",
        name: copy.brand,
        inLanguage: "uk-UA",
        publisher: { "@id": "#org" },
      },
      {
        "@type": "WebApplication",
        name: copy.brand,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: "uk-UA",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: String(STATS.price),
          priceCurrency: "UAH",
          category: "one-time",
          description:
            "Доступ до іспиту — детальна готовність, FSRS-план і нагадування",
        },
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
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export default function V21Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd />
      {children}
    </>
  );
}
