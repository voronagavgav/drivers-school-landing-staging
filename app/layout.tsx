import type { Metadata } from "next";
import { Manrope, Nunito } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

// Body text — Manrope (doc 04 §1A --font-sans).
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-manrope",
  display: "optional",
});

// Display — Nunito for headings, numerals, badges, buttons (doc 04 §1A --font-display).
const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  variable: "--font-nunito",
  display: "optional",
});

export const metadata: Metadata = {
  title: "Drivers School — підготовка до теоретичного іспиту з ПДР",
  description:
    "Платформа для підготовки до теоретичної частини іспиту з Правил дорожнього руху. Навчальний інструмент, не офіційна екзаменаційна система.",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ПДР Школа",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" className={`${manrope.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AnalyticsProvider />
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
