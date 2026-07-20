// OFFLINE E2E (wave13-19, spec §F). Proves the SW offline fallback renders and an
// offline answer lands EXACTLY ONCE after reconnect — the DB count oracle lives in
// tasks/wave13-19-offline-e2e-playwright/verify.sh; this script prints the
// machine-readable evidence lines it parses (E2E_SW / E2E_OFFLINE_FALLBACK /
// E2E_SESSION_ID / E2E_QUEUED / E2E_SYNCED).
// Runs against a PRODUCTION build on a localhost origin: localhost is a secure
// context, so the service worker registers over plain http. The cookie-transport
// bug class stays owned by the LAN-IP browser audit (bin/browser-audit.sh) — the
// two origins test disjoint failure classes.
// Usage: npm run e2e:offline   (server first: npm run build && npm run start -- -H 0.0.0.0 -p 3100)
import { chromium } from "playwright";

const ORIGIN = process.env.E2E_ORIGIN ?? "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL ?? "user@drivers.school";
const PASSWORD = process.env.E2E_PASSWORD ?? "User12345";
const SW_READY_TIMEOUT_MS = 15_000;

class E2EFailure extends Error {}
function fail(msg) {
  throw new E2EFailure(msg);
}

// Fail fast when the origin is down (the curl-000 class) with an actionable recipe.
try {
  await fetch(ORIGIN, { redirect: "manual" });
} catch {
  console.error(
    `E2E_FAIL: origin ${ORIGIN} is down — start a production server first:\n` +
      `  npm run build && npm run start -- -H 0.0.0.0 -p 3100`,
  );
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  if (process.env.E2E_DEBUG) {
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) console.error(`E2E_NAV ${frame.url()}`);
    });
  }

  // (a) Login with the seeded creds; a silent bounce back to /login means bad
  // creds or broken auth, so assert we actually LAND on /dashboard.
  await page.goto(`${ORIGIN}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page
    .waitForURL("**/dashboard", { timeout: 15_000 })
    .catch(() => fail(`login did not land on /dashboard (at ${page.url()})`));
  console.log("E2E_LOGIN=PASS");

  // (b) Service worker active. navigator.serviceWorker.ready never rejects, so
  // bound it with a race — a timeout here means no SW registered (not a prod
  // build, or a non-secure-context origin).
  const swState = await page.evaluate(
    (timeoutMs) =>
      Promise.race([
        navigator.serviceWorker.ready.then((reg) => (reg.active ? "active" : "no-active-worker")),
        new Promise((resolve) => setTimeout(() => resolve("timeout"), timeoutMs)),
      ]),
    SW_READY_TIMEOUT_MS,
  );
  if (swState !== "active") {
    fail(
      `service worker not active (${swState}) — e2e needs a production build ` +
        `served on a secure-context origin (localhost)`,
    );
  }
  console.log("E2E_SW=active");

  // (c) Offline fallback. Warm /dashboard so the SW owns the scope, then cut the
  // network at the CONTEXT level — the SW keeps running and its document
  // NetworkOnly route throws, so the router catch serves the precached /~offline
  // content (the URL stays /dashboard; only the rendered content changes).
  await page.goto(`${ORIGIN}/dashboard`, { waitUntil: "load" });
  await context.setOffline(true);
  await page
    .reload({ waitUntil: "domcontentloaded", timeout: 15_000 })
    .catch(() => fail("offline reload did not produce a document — SW fallback missing?"));
  // textContent, not innerText: untransformed and free of SSR comment nodes.
  await page
    .waitForFunction(() => document.body.textContent.includes("Ви офлайн"), null, {
      timeout: 10_000,
    })
    .catch(() => fail("offline fallback did not render «Ви офлайн»"));
  console.log("E2E_OFFLINE_FALLBACK=PASS");

  // (d) Back online, start a PRACTICE session through the real /practice form.
  // Several forms share the «Почати» label, so target the MIXED_PRACTICE form via
  // its hidden mode input; a plain JS click drives the React 19 form action.
  await context.setOffline(false);
  await page.goto(`${ORIGIN}/practice`, { waitUntil: "load" });
  const clicked = await page.evaluate(() => {
    const input = document.querySelector('input[name="mode"][value="MIXED_PRACTICE"]');
    const button = input?.closest("form")?.querySelector("button");
    if (!button) return false;
    button.click();
    return true;
  });
  if (!clicked) fail("MIXED_PRACTICE form button not found on /practice");
  await page
    .waitForURL(/\/test\/[^/]+$/, { timeout: 20_000 })
    .catch(() => fail(`practice start did not reach the runner (at ${page.url()})`));
  const sessionId = new URL(page.url()).pathname.match(/^\/test\/([^/]+)$/)?.[1];
  if (!sessionId) fail(`could not extract session id from ${page.url()}`);
  console.log(`E2E_SESSION_ID=${sessionId}`);

  // (e) Cut the network and answer the current question. ONE atomic eval locates
  // and clicks the first option (locate-then-click races React re-renders —
  // wave12b-17); the server-action POST fails network-class, the runner enqueues
  // the attempt in the IndexedDB WAL and shows the calm queued chip.
  await context.setOffline(true);
  const answered = await page.evaluate(() => {
    const option = document.querySelector('[role="radiogroup"] [role="radio"]');
    if (!(option instanceof HTMLElement)) return false;
    option.click();
    return true;
  });
  if (!answered) fail("no answer option found in the runner");
  await page
    .waitForFunction(() => document.body.textContent.includes("Збережемо, щойно з'явиться мережа"), null, {
      timeout: 15_000,
    })
    .catch(() => fail("offline answer did not show the queued chip «Збережемо, щойно з'явиться мережа»"));
  console.log("E2E_QUEUED=PASS");

  // (f) Reconnect. @serwist/next's auto-register client also installs
  // `window.addEventListener("online", () => location.reload())` (reloadOnOnline,
  // default true — CDP-traced to the serwist chunk), so the page HARD-RELOADS at
  // reconnect; the reloaded page's OfflineSync mount-drain then empties the WAL
  // through POST /api/review-sync. The reload racing the pre-unload drain is the
  // double-apply hazard the verify.sh DB oracle exists to catch. The queued chip
  // is per-render state that never re-checks the WAL, so the drain oracle is the
  // QUEUE COUNT itself: poll the ds-offline/wal store until it hits 0 (up to
  // 30s), tolerating evaluate contexts destroyed by the reload.
  await context.setOffline(false);
  const drainDeadline = Date.now() + 30_000;
  let queueCount = -1;
  while (Date.now() < drainDeadline) {
    queueCount = await page
      .evaluate(
        () =>
          new Promise((resolve) => {
            const req = indexedDB.open("ds-offline");
            req.onerror = () => resolve(-1);
            req.onsuccess = () => {
              const db = req.result;
              try {
                const count = db.transaction("wal", "readonly").objectStore("wal").count();
                count.onsuccess = () => {
                  db.close();
                  resolve(count.result);
                };
                count.onerror = () => {
                  db.close();
                  resolve(-1);
                };
              } catch {
                db.close();
                resolve(-1);
              }
            };
          }),
      )
      .catch(() => -1); // reloadOnOnline destroyed the context mid-evaluate — retry next tick
    if (queueCount === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (queueCount !== 0) {
    fail(`offline queue did not drain within 30s (count=${queueCount}) — reconnect drain broken?`);
  }
  console.log("E2E_SYNCED=PASS");

  // (g) Every step above passed (any failure threw) — exit 0. The exactly-once
  // DB oracle (ReviewLog/TestAnswer count = 1 for E2E_SESSION_ID) lives in verify.sh.
} catch (err) {
  const msg = err instanceof E2EFailure ? err.message : (err?.stack ?? String(err));
  console.error(`E2E_FAIL: ${msg}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
