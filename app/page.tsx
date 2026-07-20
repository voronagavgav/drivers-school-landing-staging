import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LandingPage } from "@/app/landing-page";

const title = "Drivers School | Маршрут до теоретичного іспиту ПДР";
const description =
  "Підготовка до теоретичного іспиту ПДР за персональним планом: офіційні питання, розумне повторення, чесна готовність та симулятор іспиту.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    locale: "uk_UA",
    type: "website",
    siteName: "Drivers School",
  },
  twitter: { card: "summary_large_image", title, description },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Drivers School",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  inLanguage: "uk-UA",
  isAccessibleForFree: true,
  description,
  offers: {
    "@type": "Offer",
    price: "399",
    priceCurrency: "UAH",
    category: "one-time",
  },
  featureList: [
    "Офіційні питання ПДР",
    "Персональне розумне повторення",
    "Оцінка готовності до іспиту",
    "Симулятор іспиту 20 питань за 20 хвилин",
  ],
};

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
