import type { NextConfig } from "next";
import { spawnSync } from "node:child_process";
import path from "node:path";
import withSerwistInit from "@serwist/next";

// Pin the workspace root: a stray package-lock.json in the parent dir made Next infer the wrong
// root (and warn). Anchor tracing + Turbopack to this project.
const root = path.resolve(import.meta.dirname);
const githubPages = process.env.GITHUB_PAGES === "true";
const githubPagesBasePath = "/drivers-school-landing-staging";

const nextConfig: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
  basePath: githubPages ? githubPagesBasePath : undefined,
  assetPrefix: githubPages ? githubPagesBasePath : undefined,
  images: {
    qualities: [60, 75],
    unoptimized: githubPages,
  },
  // Allow the dev server's client assets/HMR to load when the app is opened over the
  // mini's Tailscale/LAN IP (not just localhost) — otherwise the page renders but the
  // React bundle is blocked and nothing is interactive. (No effect in production.)
  allowedDevOrigins: ["100.110.64.90", "192.168.5.254", "clpcs-mac-mini.local"],
  // Cheap, safe security headers applied to every response in production. We deliberately
  // avoid a strict script-src/style-src CSP (Tailwind inline styles + Turbopack/React
  // hydration rely on inline assets); frame-ancestors-equivalent X-Frame-Options is safe.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

// Version the precached offline pages by the current commit so a changed page
// invalidates the old precache entry on the next deploy.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() || "dev";

// Service worker via Serwist (SPIKES.md §1): bundles app/sw.ts → public/sw.js. The plugin
// only runs on the webpack path (`next build --webpack`); it is a no-op under Turbopack
// (`next dev`), which is desired — no SW caching in dev. Registration is manual
// (components/sw-register.tsx), so auto-register is off.
const withSerwist = withSerwistInit({
  disable: githubPages,
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  register: false,
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    // The offline-practice runner is a fully static page (no RSC data) — precache it so
    // pack playback works with the network completely dead (wave13-17 Goal §3).
    { url: "/offline-practice", revision },
  ],
});

export default withSerwist(nextConfig);
