import type { Metadata } from "next";
import { Piazzolla, Manrope, JetBrains_Mono } from "next/font/google";
import { META, STATS, FAQ, BRAND } from "./copy";

/* Display: Piazzolla — an optical-size editorial serif with real gravitas,
   carrying the manifesto тези in a Cyrillic-native cut (latin+cyrillic
   verified in the font data). Body: Manrope. Numerals / labels / chips:
   JetBrains Mono (tabular figures → zero layout shift on count-up).
   All declared LOCALLY at module scope, never in the global stylesheet. */
const piazzolla = Piazzolla({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-v24-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-v24-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-v24-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://drivers.school"),
  title: META.title,
  description: META.description,
  alternates: { canonical: "/lp/v24" },
  openGraph: {
    title: META.title,
    description: META.description,
    locale: "uk_UA",
    type: "website",
    siteName: BRAND.name,
    url: "/lp/v24",
  },
  twitter: {
    card: "summary",
    title: META.title,
    description: META.description,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: BRAND.name, description: BRAND.tagline },
    { "@type": "WebSite", name: BRAND.name, inLanguage: "uk-UA" },
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

export default function V24Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${piazzolla.variable} ${manrope.variable} ${mono.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
