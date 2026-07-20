import type { Metadata } from "next";
import { copy, STATS } from "./copy";

export const metadata: Metadata = {
  title: copy.seo.title,
  description: copy.seo.description,
  alternates: { canonical: "/lp/v11" },
  openGraph: {
    title: copy.seo.title,
    description: copy.seo.description,
    locale: "uk_UA",
    type: "website",
    siteName: "Drivers School",
  },
  twitter: {
    card: "summary_large_image",
    title: copy.seo.title,
    description: copy.seo.description,
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
      name: "Drivers School — тренер готовності ПДР",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "uk-UA",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: STATS.price,
        priceCurrency: "UAH",
        category: "one-time access",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: copy.faq.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export default function V11Layout({ children }: { children: React.ReactNode }) {
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
