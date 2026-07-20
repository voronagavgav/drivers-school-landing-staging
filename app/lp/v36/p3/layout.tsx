import type { Metadata } from "next";

// P3 «Одна цифра» — a proof-band variant route under the shared V36 shell.
// Fonts + JSON-LD @graph are inherited from the parent `V36Layout`; this layout
// only overrides SEO to keep the variant OUT of the index (internal A/B surface,
// not a canonical landing page).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function V36P3Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
