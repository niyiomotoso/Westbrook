// E2E: login → upload a real photo to a room → snapshot carries it →
// player renders it → delete removes it from the snapshot.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PASSWORD = process.env.ADMIN_PW ?? "dev-password";
const OUT = "test-results/shots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}

// --- make a believable portrait JPEG (1620x2880 gradient) ---
const gen = await ctx.newPage();
await gen.setViewportSize({ width: 1620, height: 2880 });
await gen.setContent(
  `<body style="margin:0"><div style="width:1620px;height:2880px;
   background:linear-gradient(160deg,#8a7a68,#3d3a44 60%,#17202e)"></div>`,
);
const jpegPath = `${OUT}/upload-sample.jpg`;
await gen.screenshot({ path: jpegPath, type: "jpeg", quality: 90 });
await gen.close();

// --- login via the UI ---
await page.goto(`${BASE}/backoffice/photos`);
await page.waitForURL(/login/);
await page.fill("#password", PASSWORD);
await page.click("button.ad-btn");
await page.waitForURL(/backoffice\/photos/);
console.log("login ok");
await page.screenshot({ path: `${OUT}/admin-photos-empty.png` });

// --- upload to the Standard room ---
await page.selectOption("#photo-target", "room:room-standard");
await page.setInputFiles("#photo-files", jpegPath);
await page.click("text=Upload");
await page.waitForSelector(".ad-thumb", { timeout: 30000 });
console.log("upload visible in admin");
await page.screenshot({ path: `${OUT}/admin-photos-uploaded.png` });

// --- snapshot carries it with a bumped version & future activateAt ---
const snap = await page.evaluate(async () => {
  const r = await fetch("/api/content");
  return r.json();
});
const std = snap.rooms.find((r) => r.id === "room-standard");
if (!std || std.photoUrls.length !== 1) fail("snapshot missing uploaded photo");
if (!(snap.contentVersion > 1)) fail("contentVersion did not bump");
if (!(snap.activateAt > Date.now() - 60_000)) fail("activateAt not stamped");
console.log(
  "snapshot ok: v" + snap.contentVersion,
  "activate in",
  Math.round((snap.activateAt - Date.now()) / 1000) + "s",
  std.photoUrls[0],
);

// --- media route serves it immutably ---
const media = await page.evaluate(async (url) => {
  const r = await fetch(url);
  return { status: r.status, cc: r.headers.get("cache-control"), ct: r.headers.get("content-type") };
}, std.photoUrls[0]);
if (media.status !== 200 || !media.cc?.includes("immutable")) fail("media route headers wrong: " + JSON.stringify(media));
console.log("media ok:", media.ct, media.cc);

// --- player picks it up after activation (wait ≤45s) ---
const player = await ctx.newPage();
await player.setViewportSize({ width: 405, height: 720 });
await player.goto(`${BASE}/player?p=0`);
let found = false;
for (let i = 0; i < 60 && !found; i++) {
  await player.waitForTimeout(1500);
  found = await player.evaluate(
    (url) => !!document.querySelector(`img[src="${url}"]`),
    std.photoUrls[0],
  );
}
if (!found) fail("player never rendered the uploaded photo");
else console.log("player renders the uploaded photo");
await player.screenshot({ path: `${OUT}/player-with-upload.png` });
await player.close();

// --- delete soft-removes it from the snapshot but media stays (grace) ---
page.on("dialog", (d) => d.accept());
await page.click("button.ad-btn.danger");
await page.waitForTimeout(1500);
const snap2 = await page.evaluate(async () => (await fetch("/api/content")).json());
const std2 = snap2.rooms.find((r) => r.id === "room-standard");
if (std2.photoUrls.length !== 0) fail("photo still in snapshot after delete");
const mediaAfter = await page.evaluate(async (url) => (await fetch(url)).status, std.photoUrls[0]);
if (mediaAfter !== 200) fail("media should still serve during the 24h grace");
console.log("delete ok: gone from snapshot, media in grace");

await browser.close();
console.log(process.exitCode ? "E2E FAILED" : "E2E PASSED");
