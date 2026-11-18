// E2E: first-run setup, heartbeat → screens page, hidden gesture + PIN.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PASSWORD = process.env.ADMIN_PW ?? "dev-password";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 405, height: 720 } });
const page = await ctx.newPage();
let failed = false;
const fail = (m) => {
  console.error("FAIL:", m);
  failed = true;
};

// --- first run: setup screen appears ---
await page.goto(`${BASE}/player`);
await page.waitForSelector("text=WestBrook Wall setup", { timeout: 20000 });
console.log("setup screen shown on first run");

// choose Middle + PIN 4321 and start
await page.click("text=Middle");
await page.fill("#setup-pin", "4321");
await page.click("text=Start the wall");
await page.waitForSelector(".screen", { timeout: 20000 });
console.log("wall starts after setup");

// --- reload goes straight to the player (config persisted) ---
await page.reload();
await page.waitForSelector(".screen", { timeout: 20000 });
const setupVisible = await page.locator("text=WestBrook Wall setup").count();
if (setupVisible) fail("setup reappeared after reload");
else console.log("config persisted across reload");

// --- heartbeat reaches the screens page ---
await page.waitForTimeout(2500);
const admin = await ctx.newPage();
await admin.goto(`${BASE}/backoffice/screens`);
if (admin.url().includes("login")) {
  await admin.fill("#password", PASSWORD);
  await admin.click("button.ad-btn");
  await admin.waitForURL(/backoffice\/photos/);
  await admin.goto(`${BASE}/backoffice/screens`);
}
await admin.waitForSelector("text=Middle");
const healthy = await admin.locator("text=healthy").count();
if (!healthy) fail("screens page does not show the heartbeating screen as healthy");
else console.log("screens page shows the Middle screen healthy");
await admin.close();

// --- short corner press does nothing ---
await page.mouse.move(40, 40);
await page.mouse.down();
await page.waitForTimeout(3000);
await page.mouse.up();
await page.waitForTimeout(500);
if (await page.locator("text=Enter the setup PIN").count())
  fail("3s press opened the PIN gate (needs 5s)");
else console.log("short press ignored");

// --- 5s corner press opens the PIN gate; wrong PIN stays locked ---
await page.mouse.move(40, 40);
await page.mouse.down();
await page.waitForTimeout(5400);
await page.mouse.up();
await page.waitForSelector("text=Enter the setup PIN");
console.log("5s corner press opens the PIN gate");
await page.fill('input[aria-label="Setup PIN"]', "0000");
await page.waitForSelector("text=Not right");
console.log("wrong PIN rejected");
await page.fill('input[aria-label="Setup PIN"]', "4321");
await page.waitForSelector("text=WestBrook Wall setup");
console.log("correct PIN reopens setup");

// --- wake lock active (where supported) ---
const wake = await page.evaluate(() => "wakeLock" in navigator);
console.log("wakeLock API present:", wake);

await browser.close();
console.log(failed ? "E2E FAILED" : "E2E PASSED");
process.exitCode = failed ? 1 : 0;
