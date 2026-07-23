import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

// Manrope carries the complete Ukrainian UI. The dashboard uses one disciplined
// family for display, body, and numerals so dense product screens stay coherent.
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3002");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Drivers School — підготовка до теоретичного іспиту з ПДР",
  description:
    "Платформа для підготовки до теоретичної частини іспиту з Правил дорожнього руху. Навчальний інструмент, не офіційна екзаменаційна система.",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ПДР Школа",
  },
};

const themeBootstrapScript = `
  try {
    const savedTheme = window.localStorage.getItem("drivers-school-theme");
    const theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = theme;
  } catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="uk"
      data-scroll-behavior="smooth"
      className={`h-full font-sans antialiased ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <AnalyticsProvider />
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
