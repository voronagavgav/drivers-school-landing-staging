import { requireUser, canManageContent } from "@/lib/rbac";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { getAnonUser } from "@/lib/server/anon-session";
import { isValueFirstFunnelEnabled } from "@/lib/funnel";
import { AppNav } from "@/components/app-nav";
import { GlassShell } from "@/components/glass-shell";
import { OfflineSync } from "@/components/offline-sync";
import { SvitlykSprite } from "@/components/svitlyk";
import { getGlassTierOverride } from "@/lib/server/user-settings";

// Flag-aware shell identity (Wave 17). Real logged-in user wins; else WHEN the value-first funnel
// is on, the (read-only) anon user for the ds_anon_play cookie — which may be null before the visitor
// starts their first loop, so the shell renders anon-friendly WITHOUT minting a row. Flag-off falls
// through to requireUser(), byte-for-byte the old redirect-to-/login gate.
async function resolveShellUser(): Promise<SessionUser | null> {
  const real = await getCurrentUser();
  if (real) return real;
  if (isValueFirstFunnelEnabled()) return getAnonUser();
  return requireUser();
}

// Synchronous no-flash tier script (Wave-12a §B). Runs during parse, BEFORE hydration, so the
// initial paint already carries the resolved surface class — no emulated→real flash. It is a
// TINY vanilla guess: accessibility prefs win (→ solid), then the explicit override, then for
// "auto" a cheap capability probe optimistically applies `glass-real` so the full client
// `resolveGlassTier` (GlassShell, post-mount) can only DEMOTE, never cause a jarring upgrade.
// MUST mirror lib/glass-tier.ts resolveGlassTier exactly (wave12a-review major: this inline mirror
// diverged — it skipped the deviceMemory/hardwareConcurrency strong-signals, so weak ≥761px desktops
// painted real backdrop-filter at first paint). `?? 4` mirrors glass-shell.tsx's undefined default.
function noFlashScript(override: string): string {
  return `(function(){try{var o=${JSON.stringify(override)},c=document.body.classList,n=navigator,m=function(q){return window.matchMedia(q).matches};if(m('(prefers-reduced-transparency: reduce)')||m('(prefers-contrast: more)')){c.add('glass-solid');return}if(o==='solid'){c.add('glass-solid');return}if(o==='real'){c.add('glass-real');return}if(o==='emulated'){return}if(m('(pointer: fine)')&&m('(min-width: 761px)')&&!m('(prefers-reduced-motion: reduce)')&&(n.deviceMemory!=null?n.deviceMemory:4)>=8&&(n.hardwareConcurrency||0)>=8){c.add('glass-real')}}catch(e){}})();`;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, glassOverride] = await Promise.all([resolveShellUser(), getGlassTierOverride()]);
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <script dangerouslySetInnerHTML={{ __html: noFlashScript(glassOverride) }} />
      <GlassShell override={glassOverride} />
      <OfflineSync />
      <SvitlykSprite />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-blue-500"
      >
        Перейти до вмісту
      </a>
      <AppNav
        canManage={user ? canManageContent(user.role) : false}
        userName={user?.name ?? "Гість"}
      />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-5 pb-28 pt-6 sm:pb-6">
        {children}
      </main>
    </div>
  );
}
