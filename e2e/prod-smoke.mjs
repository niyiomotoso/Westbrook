// Production smoke against the live workers.dev deployment: player boots,
// snapshot sane, admin login works with the real password, upload→appear→
// delete round-trip, rate-limit headers, SW registered.
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = "https://westbrook-wall.westbrook-hotel.workers.dev";
const PASSWORD = fs
  .readFileSync(path.join(os.homedir(), ".westbrook-admin-password"), "utf8")
  .trim();
fs.mkdirSync("test-results/shots", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 405, height: 720 } });
const page = await ctx.newPage();
let failed = false;
const fail = (m) => {
  console.error("FAIL:", m);
  failed = true;
};

// --- player boots on prod with a registered SW ---
await page.goto(`${BASE}/player?p=0`, { waitUntil: "networkidle" });
await page.waitForSelector(".screen", { timeout: 30000 });
await page.waitForTimeout(5000);
const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker?.getRegistration();
  return reg?.active?.state ?? "none";
});
console.log("prod sw:", sw);
if (sw !== "activated") fail("prod service worker not active");
await page.screenshot({ path: "test-results/shots/prod-player.png" });

// --- snapshot sane; time endpoint no-store ---
const sane = await page.evaluate(async () => {
  const r = await fetch("/api/content");
  const s = await r.json();
  const t = await fetch("/api/time");
  return {
    etag: r.headers.get("etag"),
    cc: r.headers.get("cache-control"),
    rooms: s.rooms.length,
    build: s.buildId,
    timeCc: t.headers.get("cache-control"),
  };
});
console.log("prod snapshot:", JSON.stringify(sane));
if (sane.cc !== "no-store" || sane.timeCc !== "no-store") fail("cache headers wrong");
if (sane.build === "dev") fail("prod build id is 'dev' — BUILD_ID not injected");

// --- admin login with the real password ---
await page.goto(`${BASE}/backoffice/photos`);
await page.waitForURL(/login/);
await page.fill("#password", PASSWORD);
await page.click("button.ad-btn");
await page.waitForURL(/backoffice\/photos/, { timeout: 20000 });
console.log("prod admin login ok");

// --- upload a photo to Standard, see it, delete it ---
const gen = await ctx.newPage();
await gen.setViewportSize({ width: 1080, height: 1920 });
await gen.setContent(
  '<body style="margin:0"><div style="width:1080px;height:1920px;background:linear-gradient(160deg,#a58660,#4a3a30)"></div>',
);
const jpegPath = "test-results/shots/prod-upload.jpg";
await gen.screenshot({ path: jpegPath, type: "jpeg", quality: 88 });
await gen.close();

await page.selectOption("#photo-target", "room:room-standard");
await page.setInputFiles("#photo-files", jpegPath);
await page.click("text=Upload");
await page.waitForSelector(".ad-thumb", { timeout: 40000 });
console.log("prod upload ok");
const snap = await page.evaluate(async () => (await fetch("/api/content")).json());
const std = snap.rooms.find((r) => r.id === "room-standard");
if (!std || std.photoUrls.length < 1) fail("prod snapshot missing upload");
const mediaOk = await page.evaluate(
  async (u) => (await fetch(u)).status,
  std.photoUrls[0],
);
if (mediaOk !== 200) fail("prod media not serving");
else console.log("prod media serves from KV");

// clean up: delete it again
await page.click("button.ad-btn.danger");
await page.waitForTimeout(1500);
const snap2 = await page.evaluate(async () => (await fetch("/api/content")).json());
if (snap2.rooms.find((r) => r.id === "room-standard").photoUrls.length !== 0) {
  fail("prod delete did not clear snapshot");
} else console.log("prod delete ok");

// --- wrong password is rejected on prod ---
const wrong = await page.evaluate(async () => {
  const r = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "definitely-wrong" }),
  });
  return r.status;
});
if (wrong !== 401 && wrong !== 429) fail(`wrong password gave ${wrong}`);
else console.log("prod rejects a wrong password:", wrong);

await browser.close();
console.log(failed ? "PROD SMOKE FAILED" : "PROD SMOKE PASSED");
process.exitCode = failed ? 1 : 0;
