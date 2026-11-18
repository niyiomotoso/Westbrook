// Visual-QA screenshot helper (invoked ad hoc, not a test suite).
// Usage: node e2e/shots.mjs
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = "test-results/shots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// 1. Our gallery — every slide variant at native 270x480.
const page = await browser.newPage({ viewport: { width: 1600, height: 2300 } });
await page.goto("http://localhost:3100/player/gallery", {
  waitUntil: "networkidle",
});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600); // QR + svg settle
await page.screenshot({ path: `${OUT}/gallery.png`, fullPage: true });

// Per-slide crops for close comparison
for (const label of [
  "welcome",
  "room-standard",
  "room-deluxe-tag",
  "place-pool",
  "place-restaurant",
  "reviews",
  "good-to-know",
  "xmas-room",
  "indep-welcome",
]) {
  const el = page.locator(`[data-gallery-screen="${label}"]`);
  await el.screenshot({ path: `${OUT}/ours-${label}.png` });
}

// 2. The reference figures, cropped from the reference HTML itself.
const ref = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
await ref.goto(
  "file:///Users/michi/Documents/Westbrook/docs/westbrook-wall-full-loop.html",
  { waitUntil: "networkidle" },
);
await ref.evaluate(() => document.fonts.ready);
await ref.waitForTimeout(800);
// First wall of the loop: welcome / standard / deluxe+timecard
const screens = ref.locator(".wall .screen");
const labels = ["ref-welcome", "ref-room-standard", "ref-room-deluxe-tag"];
for (let i = 0; i < 3; i++) {
  await screens.nth(i).screenshot({ path: `${OUT}/${labels[i]}.png` });
}
// Reviews page + good-to-know appear later in the loop walls
const count = await screens.count();
console.log("reference screens found:", count);
// steps are 3 per wall, 11 walls; step 10 wall (index 9) has reviews mid
await screens.nth(9 * 3 + 0).screenshot({ path: `${OUT}/ref-reviews-left.png` });
await screens.nth(8 * 3 + 2).screenshot({ path: `${OUT}/ref-reviews-right.png` });
await screens.nth(10 * 3 + 0).screenshot({ path: `${OUT}/ref-goodtoknow.png` });

// 3. The real player at tablet size (scaled) for three positions.
for (const p of [0, 1, 2]) {
  const t = await browser.newPage({ viewport: { width: 1080 / 2, height: 1920 / 2 } });
  await t.goto(`http://localhost:3100/player?p=${p}`, { waitUntil: "networkidle" });
  await t.evaluate(() => document.fonts.ready);
  await t.waitForTimeout(1500);
  await t.screenshot({ path: `${OUT}/tablet-p${p}.png` });
  await t.close();
}
// Letterbox check at 1200x1920 aspect (600x960)
const lb = await browser.newPage({ viewport: { width: 600, height: 960 } });
await lb.goto("http://localhost:3100/player?p=1", { waitUntil: "networkidle" });
await lb.waitForTimeout(1200);
await lb.screenshot({ path: `${OUT}/tablet-1200x1920.png` });

await browser.close();
console.log("done");
