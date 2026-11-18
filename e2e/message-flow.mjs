// E2E: post-now message → stamped 30s lead → player takes over within 1s
// of startAt → loop restarts (epoch = end) → overlap + cancel rules.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PASSWORD = process.env.ADMIN_PW ?? "dev-password";
fs.mkdirSync("test-results/shots", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
let failed = false;
const fail = (m) => {
  console.error("FAIL:", m);
  failed = true;
};

await page.goto(`${BASE}/backoffice/messages`);
await page.fill("#password", PASSWORD);
await page.click("button.ad-btn");
await page.waitForURL(/backoffice\/photos/);
await page.goto(`${BASE}/backoffice/messages`);
await page.waitForSelector("#msg-kicker");

// Pick the Welcome back template, fill the name, post now.
await page.click("text=Welcome back");
await page.fill("#msg-name", "Mr Okafor");
await page.click("text=Post to all screens");
await page.waitForSelector("text=Going up");
const posted = Date.now();
console.log("posted");

// Snapshot: visible immediately (within 60s window), startAt ≈ now+30s.
const snap = await page.evaluate(async () => (await fetch("/api/content")).json());
if (!snap.message) fail("snapshot missing the posted message");
const lead = snap.message.startAt - posted;
if (lead < 25_000 || lead > 35_000) fail(`post-now lead off: ${lead}ms`);
else console.log("stamped lead:", Math.round(lead / 1000) + "s");
if (!snap.message.body.includes("Mr Okafor")) fail("name not substituted");

// Overlap rejected.
const overlapStatus = await page.evaluate(async (startAt) => {
  const r = await fetch("/api/admin/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kicker: "Test",
      name: "X",
      body: "overlap probe",
      startAt: startAt + 2000,
      durationS: 10,
    }),
  });
  return r.status;
}, snap.message.startAt);
if (overlapStatus !== 409) fail(`overlap should 409, got ${overlapStatus}`);
else console.log("overlap rejected");

// Cancel within 30s of start is refused.
const lateCancel = await page.evaluate(async () => {
  const d = await (await fetch("/api/admin/messages")).json();
  const m = d.messages.find((x) => !x.canceled && x.startAt > Date.now());
  if (!m) return "none";
  return (await fetch(`/api/admin/messages?id=${m.id}`, { method: "DELETE" })).status;
});
if (lateCancel !== 409) fail(`late cancel should 409, got ${lateCancel}`);
else console.log("late cancel refused");

// Player: watch for the takeover; measure when it appears vs startAt.
const player = await ctx.newPage();
await player.setViewportSize({ width: 405, height: 720 });
await player.goto(`${BASE}/player?p=1`);
await player.waitForSelector(".screen", { timeout: 20000 });
const appearedAt = await player.evaluate(async (startAt) => {
  const deadline = startAt + 10_000;
  while (Date.now() < deadline) {
    const el = document.querySelector(".fcard.big, .brandpg .bguest");
    if (el) return Date.now();
    await new Promise((r) => setTimeout(r, 100));
  }
  return 0;
}, snap.message.startAt);
if (!appearedAt) fail("message never appeared on the player");
else {
  const delta = appearedAt - snap.message.startAt;
  console.log("takeover delta vs stamped start:", delta + "ms");
  if (Math.abs(delta) > 1500) fail("takeover more than ~1s from stamped start");
}
await player.screenshot({ path: "test-results/shots/message-live.png" });

// Wait for the window to end → epoch advances to message end.
await player.waitForTimeout(snap.message.durationMs + 2500);
const snap2 = await player.evaluate(async () => (await fetch("/api/content")).json());
const expectedEpoch = snap.message.startAt + snap.message.durationMs;
if (snap2.loopEpoch !== expectedEpoch) {
  fail(`epoch should equal message end ${expectedEpoch}, got ${snap2.loopEpoch}`);
} else console.log("epoch reset to message end — loop restarts on Welcome");
// And the player is back on the welcome slide shortly after restart.
const onWelcome = await player.evaluate(
  () => !!document.querySelector(".brandpg .bwel"),
);
// position 1 shows welcome at slot+1... left screen shows welcome at slot 0;
// middle shows index 1. So just assert the message is gone.
const stillMessage = await player.evaluate(
  () => !!document.querySelector(".fcard.big"),
);
if (stillMessage) fail("message still showing after its window");
else console.log("message cleared after window", onWelcome ? "(welcome visible)" : "");
await player.close();

await browser.close();
console.log(failed ? "E2E FAILED" : "E2E PASSED");
process.exitCode = failed ? 1 : 0;
