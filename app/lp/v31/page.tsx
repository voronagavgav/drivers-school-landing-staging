// Landing v31 «Термінал» — thin server shell.
// The whole surface is one interactive exam terminal (client leaf). No marketing
// sections. Real question data is baked into copy.ts at author time (DB-free at
// runtime). SEO / fonts / JSON-LD live in layout.tsx.
import Terminal from "./Terminal";

export default function V31Page() {
  return <Terminal />;
}
