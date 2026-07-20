import type { Metadata } from "next";

// P1 «До героя» — the proof merged INTO the hero (no separate proof band).
// Fonts + JSON-LD @graph are inherited from the parent `V36Layout`; this layout
// only overrides SEO to keep the variant OUT of the index (internal A/B surface,
// not a canonical landing page).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function V36P1Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
