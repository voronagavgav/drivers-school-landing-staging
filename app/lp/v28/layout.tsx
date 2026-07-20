import type { Metadata } from "next";
import { Arsenal, JetBrains_Mono } from "next/font/google";
import { STATS, FAQ } from "./copy";

// v28 «Дві дороги» — NEW visual system. Display + body: Arsenal (native Ukrainian cyrillic by Andrij
// Shevchenko — humanist, confident, unclaimed by prior variants). Numerals/stats: JetBrains Mono
// (cyrillic verified). Pair on a weight/role axis: one humanist family in two weights + a mono for data.
const arsenal = Arsenal({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

const TITLE = "Тести ПДР 2026 онлайн — тренер готовності до іспиту";
const DESCRIPTION =
  "Сам чи в автошколі — шанси скласти майже однакові. Різниця в тому, чи знаєш ти, що готовий. Калібрований показник готовності, FSRS-план до дати іспиту. Питання й симулятор — безкоштовно.";

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

export default function V28Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${arsenal.variable} ${jetbrains.variable}`}
      style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
