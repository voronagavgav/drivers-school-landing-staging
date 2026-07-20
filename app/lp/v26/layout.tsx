import type { Metadata } from "next";
import { Literata, IBM_Plex_Sans } from "next/font/google";
import { COPY, N } from "./copy";

/* Visual system inherited faithfully from the built v3 «Білет №»:
   Display = Literata (optical-size editorial serif with a real Cyrillic cut) carrying
   the exam-ticket headers and тези; Body = IBM Plex Sans for legible ink-on-paper text.
   Declared LOCALLY at module scope (next/font requirement), never in the global sheet. */
const display = Literata({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-v26-display",
  display: "swap",
});
const body = IBM_Plex_Sans({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-v26-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://drivers.school"),
  title: COPY.meta.title,
  description: COPY.meta.description,
  alternates: { canonical: "/lp/v26" },
  openGraph: {
    title: COPY.meta.title,
    description: COPY.meta.description,
    locale: "uk_UA",
    type: "website",
    siteName: COPY.brand,
    url: "/lp/v26",
  },
  twitter: {
    card: "summary",
    title: COPY.meta.title,
    description: COPY.meta.description,
  },
};

// Single JSON-LD @graph emitted server-side; the FAQPage is generated from the SAME
// data array that renders the visible accordion (never hand-duplicated).
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: COPY.brand, inLanguage: "uk-UA" },
    { "@type": "WebSite", name: COPY.brand, inLanguage: "uk-UA" },
    {
      "@type": "WebApplication",
      name: COPY.brand,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      inLanguage: "uk-UA",
      offers: {
        "@type": "Offer",
        price: String(N.price),
        priceCurrency: "UAH",
        category: "one-time",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: COPY.faq.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    },
  ],
};

export default function V26Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${body.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
