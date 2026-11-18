// E2E against the workerd preview (real SW): network cut mid-playback,
// reload while offline, recovery on reconnect. (R11, R17 ground truth.)
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:8787";
fs.mkdirSync("test-results/shots", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 405, height: 720 } });
const page = await ctx.newPage();
let failed = false;
const fail = (m) => {
  console.error("FAIL:", m);
  failed = true;
};

// Plain /player — the real kiosk URL (position lives in localStorage).
await page.goto(`${BASE}/player`, { waitUntil: "networkidle" });
await page.waitForSelector(".screen", { timeout: 30000 });
// Let the SW install, claim, and warm the media cache.
await page.waitForTimeout(8000);
const swState = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg?.active?.state ?? "none";
});
console.log("sw state:", swState);
if (swState !== "activated") fail("service worker not active");

const slideSig = () =>
  page.evaluate(() => {
    const el = document.querySelector(".prog");
    if (!el) return "none";
    return [...el.children].findIndex((c) => c.className === "on") + "/" + el.children.length;
  });

// Sample over 1.5 slots repeatedly: distinct values prove advancement
// (a single widely-spaced pair can alias back to the same index).
async function observeAdvance(label) {
  const seen = new Set();
  for (let i = 0; i < 7; i++) {
    seen.add(await slideSig());
    await page.waitForTimeout(2000);
  }
  if (seen.has("none") || seen.size < 2) fail(`${label}: loop not advancing (${[...seen]})`);
  else console.log(`${label}: advancing (${[...seen].join(" ")})`);
}

// --- cut the network mid-playback ---
await ctx.setOffline(true);
await observeAdvance("offline mid-playback");

// --- reload while offline: SW shell + stored snapshot boot ---
await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(6000);
const afterReload = await page.evaluate(() => ({
  hasScreen: !!document.querySelector(".screen"),
  hasContent: !!document.querySelector(".prog, .brandpg, .photo"),
  bg: getComputedStyle(document.body).backgroundColor,
}));
console.log("offline reload:", JSON.stringify(afterReload));
if (!afterReload.hasScreen || !afterReload.hasContent) {
  fail("offline reload did not boot the wall from cache");
} else console.log("offline reload boots from cache");
await page.screenshot({ path: "test-results/shots/offline-reload.png" });

// --- still advancing after the offline boot ---
await observeAdvance("after offline boot");

// --- reconnect: polling resumes without a reload ---
await ctx.setOffline(false);
await page.waitForTimeout(16000);
const polled = await page.evaluate(async () => {
  try {
    const r = await fetch("/api/content");
    return r.ok;
  } catch {
    return false;
  }
});
if (!polled) fail("API unreachable after reconnect");
else console.log("reconnected fine");

await browser.close();
console.log(failed ? "E2E FAILED" : "E2E PASSED");
process.exitCode = failed ? 1 : 0;
