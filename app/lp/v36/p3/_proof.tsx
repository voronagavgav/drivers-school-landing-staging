/* ══════════════════════════════════════════════════════════════════════════
   P3 «Одна цифра» — proof-band variant: ONE dominant numeral.

   The reference PRINCIPLE (not any site's layout): one number at headline
   weight beats a row of co-equal stat tiles. So the whole band is carried by
   the BANK_B_FMT numeral at display scale, framed as the READER'S OWN outcome —
   the illustrated/sections figures + the honest official-bank claim read as
   quiet subordinate prose, not parallel tiles. Composition is asymmetric /
   non-row; typography carries it.

   Every figure comes VERBATIM from the shared constants (via ./copy → ../copy);
   no bank-size literal is ever retyped. Static composition (no motion, no
   reveal) → the reduced-motion guard is vacuously satisfied.

   Scoped <style> uses only NEW `p3-` class names + the existing `.v36` palette
   vars; it does not touch _body.tsx's styles.
   ══════════════════════════════════════════════════════════════════════════ */

import { P3_PROOF } from "./copy";

const CSS = `
.v36 .p3-band{max-width:880px;margin:0 auto;background:var(--surface);border:2px solid var(--line);
  border-radius:var(--r-lg);padding:clamp(28px,3.6vw,50px) clamp(24px,3.6vw,56px);
  box-shadow:0 40px 70px -50px rgba(20,34,63,.5);
  display:grid;gap:clamp(14px,1.8vw,20px);}
.v36 .p3-lead{font-family:var(--font-display);font-weight:700;letter-spacing:-.015em;
  font-size:clamp(1.02rem,1.7vw,1.28rem);line-height:1.4;color:var(--ink-soft);
  max-width:30ch;margin:0;text-wrap:balance;}
/* the ONE dominant element — display-scale numeral, ≥2× the subordinate prose */
.v36 .p3-hero{margin:2px 0 0;display:flex;align-items:baseline;gap:clamp(10px,1.6vw,18px);
  flex-wrap:wrap;line-height:.92;}
.v36 .p3-num{font-family:var(--font-display);font-weight:800;letter-spacing:-.035em;
  font-size:clamp(4rem,15vw,8.6rem);color:var(--blue-700);white-space:nowrap;text-wrap:balance;}
.v36 .p3-unit{font-family:var(--font-display);font-weight:700;letter-spacing:-.02em;
  font-size:clamp(1.05rem,2.1vw,1.55rem);color:var(--muted);}
.v36 .p3-outcome{font-family:var(--font-display);font-weight:700;letter-spacing:-.015em;
  font-size:clamp(1.14rem,2vw,1.5rem);line-height:1.34;color:var(--ink);
  max-width:26ch;margin:0;text-wrap:balance;}
/* subordinate prose — quiet, small, NOT co-equal tiles */
.v36 .p3-detail{font-size:clamp(.95rem,1.2vw,1.02rem);line-height:1.55;color:var(--ink-soft);
  max-width:44ch;margin:0;}
.v36 .p3-claim{font-size:.9rem;line-height:1.5;color:var(--muted);max-width:44ch;margin:0;}
`;

export function P3Proof() {
  return (
    <div className="wrap proof">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="p3-band">
        <span className="chip">
          <span className="dot" />
          {P3_PROOF.chip}
        </span>
        <p className="p3-lead">{P3_PROOF.lead}</p>
        <p className="p3-hero">
          <span className="p3-num num">{P3_PROOF.hero}</span>
          <span className="p3-unit">{P3_PROOF.heroUnit}</span>
        </p>
        <p className="p3-outcome">{P3_PROOF.outcome}</p>
        <p className="p3-detail">{P3_PROOF.detail}</p>
        <p className="p3-claim">{P3_PROOF.claim}</p>
      </div>
    </div>
  );
}
