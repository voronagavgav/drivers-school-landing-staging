import type { Metadata } from "next";
import { Fira_Sans, PT_Mono } from "next/font/google";
import { STATS, FAQ } from "./copy";

// Display + body: Fira Sans (cyrillic verified). Mono IS the board: PT Mono.
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

export default function V12Layout({ children }: { children: React.ReactNode }) {
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
