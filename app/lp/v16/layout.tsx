import type { Metadata } from "next";
import { Fira_Sans, PT_Mono } from "next/font/google";
import { STATS, COPY } from "./copy";

// Inherited from v12's «Табло» system. Display + body: Fira Sans (cyrillic verified).
// The board IS mono: PT Mono for flap digits and board labels.
const firaSans = Fira_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-fira",
  display: "swap",
});

const ptMono = PT_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  variable: "--font-board",
  display: "swap",
});

const TITLE = "Тести ПДР онлайн 2026 — офіційні питання і тренер готовності | Drivers School";
const DESCRIPTION =
  "2322 офіційних питання, пояснення та симулятор іспиту (20 питань · 20 хвилин · 2 помилки) — безкоштовно, без реєстрації. Тренер, який рахує твою готовність до іспиту.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/lp/v16" },
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
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: COPY.sources.faq.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    },
  ],
};

export default function V16Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${firaSans.variable} ${ptMono.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
