import type { Metadata } from "next";
import { Golos_Text, JetBrains_Mono } from "next/font/google";
import { META, STATS, FAQ, BRAND } from "./copy";

/* Display + body: Golos Text — a Cyrillic-native grotesque (cool, rational,
   institutional) that carries the spec-sheet register without the exhausted
   IBM-Plex reflex; latin+cyrillic verified in the font data.
   Numerals / amounts / table labels: JetBrains Mono — tabular figures for a
   true ledger with zero layout shift on count-up; cyrillic verified.
   Both declared LOCALLY at module scope (never the global stylesheet). */
const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--v23-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--v23-mono",
  display: "swap",
});

export const metadata: Metadata = {
  /* absolute-URL base for canonical / og:url / og:image — falls back to the
     public site origin when the deploy env doesn't set one, so share cards and
     canonical never resolve against a wrong origin in prod. */
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://drivers.school"),
  title: META.title,
  description: META.description,
  alternates: { canonical: "/lp/v23" },
  openGraph: {
    title: META.title,
    description: META.description,
    locale: "uk_UA",
    type: "website",
    siteName: BRAND.name,
    url: "/lp/v23",
  },
  twitter: {
    card: "summary_large_image",
    title: META.title,
    description: META.description,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: BRAND.name,
      description: BRAND.tagline,
    },
    {
      "@type": "WebSite",
      name: BRAND.name,
      inLanguage: "uk-UA",
    },
    {
      "@type": "WebApplication",
      name: BRAND.name,
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

export default function V23Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${golos.variable} ${mono.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
