/* ══════════════════════════════════════════════════════════════════════════
   P2 «Показати, не порахувати» — proof-band variant: SHOW the evidence first.

   The reference PRINCIPLE (not any site's layout): demonstrate the product with
   real artifacts, THEN let the numbers confirm. So the band leads with a strip
   of REAL restyled question illustrations from the live official bank; the
   figures land as CAPTIONS pinned to that evidence, never as a floating row of
   co-equal stat tiles (the exact anti-pattern being avoided).

   Every figure comes VERBATIM from the shared constants (via ./copy → ../copy);
   no bank-size literal is ever retyped. Every image src references a file that
   EXISTS under public/restyled-live/ — no invented filenames.

   Graceful degradation: each image is lazy-loaded inside a FIXED aspect-ratio
   box → no layout shift as the strip fills in. Static composition (no motion,
   no reveal) → the reduced-motion guard is vacuously satisfied.

   Scoped <style> uses only NEW `p2-` class names + the existing `.v36` palette
   vars; it does not touch _body.tsx's styles.
   ══════════════════════════════════════════════════════════════════════════ */

import { P2_FIGURES, P2_PROOF } from "./copy";

const CSS = `
.v36 .p2-band{max-width:1000px;margin:0 auto;background:var(--surface);border:2px solid var(--line);
  border-radius:var(--r-lg);padding:clamp(24px,3vw,44px) clamp(20px,3vw,48px);
  box-shadow:0 40px 70px -50px rgba(20,34,63,.5);
  display:grid;gap:clamp(14px,1.8vw,22px);}
.v36 .p2-lead{font-family:var(--font-display);font-weight:700;letter-spacing:-.015em;
  font-size:clamp(1.06rem,1.9vw,1.42rem);line-height:1.4;color:var(--ink);
  max-width:36ch;margin:0;text-wrap:balance;}
/* the evidence — a horizontal strip; on narrow screens it scrolls WITHIN itself
   (never overflowing the document) */
.v36 .p2-strip{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(150px,20vw,208px);
  gap:clamp(12px,1.4vw,18px);overflow-x:auto;overflow-y:hidden;
  padding:2px 2px 10px;margin:0 -2px;scroll-snap-type:x proximity;
  -webkit-overflow-scrolling:touch;scrollbar-width:thin;}
.v36 .p2-fig{margin:0;scroll-snap-align:start;}
/* FIXED aspect-ratio box → no layout shift while lazy images fill in */
.v36 .p2-shot{aspect-ratio:4/3;width:100%;border-radius:var(--r-sm);overflow:hidden;
  border:2px solid var(--line);background:var(--blue-tint);display:block;}
.v36 .p2-shot img{width:100%;height:100%;object-fit:cover;display:block;}
/* the numbers, pinned AS captions to the evidence — not a stat-tile row */
.v36 .p2-cap{font-family:var(--font-display);font-weight:700;letter-spacing:-.01em;
  font-size:clamp(1.08rem,1.7vw,1.34rem);line-height:1.36;color:var(--ink);margin:0;
  max-width:40ch;text-wrap:balance;}
.v36 .p2-detail{font-size:clamp(.95rem,1.2vw,1.02rem);line-height:1.55;color:var(--ink-soft);
  max-width:48ch;margin:0;}
.v36 .p2-claim{font-size:.9rem;line-height:1.5;color:var(--muted);max-width:48ch;margin:0;}
`;

export function P2Proof() {
  return (
    <div className="wrap proof">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="p2-band">
        <span className="chip">
          <span className="dot" />
          {P2_PROOF.chip}
        </span>
        <p className="p2-lead">{P2_PROOF.lead}</p>
        <div className="p2-strip">
          {P2_FIGURES.map((fig) => (
            <figure className="p2-fig" key={fig.src}>
              <span className="p2-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fig.src} alt={fig.alt} loading="lazy" width={208} height={156} />
              </span>
            </figure>
          ))}
        </div>
        <p className="p2-cap num">{P2_PROOF.imgCaption}</p>
        <p className="p2-detail">{P2_PROOF.detail}</p>
        <p className="p2-claim">{P2_PROOF.claim}</p>
      </div>
    </div>
  );
}
