// E2E: rooms CRUD + reorder, review consent gate, settings round-trip + QR.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PASSWORD = process.env.ADMIN_PW ?? "dev-password";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
let failed = false;
const fail = (m) => {
  console.error("FAIL:", m);
  failed = true;
};

await page.goto(`${BASE}/backoffice/rooms`);
await page.fill("#password", PASSWORD);
await page.click("button.ad-btn");
await page.waitForURL(/backoffice\/photos/);
await page.goto(`${BASE}/backoffice/rooms`);
await page.waitForSelector(".ad-row");

// --- add a room ---
await page.fill("#room-name", "Penthouse");
await page.fill("#room-price", "250000");
await page.fill("#room-tag", "1 left tonight");
await page.click("text=Add room");
await page.waitForSelector("text=Penthouse");
console.log("room added");

// --- reorder: move Penthouse up once ---
const names = () =>
  page.evaluate(async () => {
    const d = await (await fetch("/api/admin/rooms")).json();
    return d.rooms.map((r) => r.name);
  });
const before = await names();
await page.click(`[aria-label="Move Penthouse up"]`);
await page.waitForTimeout(800);
const after = await names();
if (JSON.stringify(before) === JSON.stringify(after)) fail("reorder did nothing");
else console.log("reorder ok:", before.join(","), "->", after.join(","));

// --- snapshot respects order + new room ---
const snap = await page.evaluate(async () => (await fetch("/api/content")).json());
if (!snap.rooms.some((r) => r.name === "Penthouse")) fail("snapshot missing new room");

// --- reviews: consent gate ---
await page.goto(`${BASE}/backoffice/reviews`);
await page.fill("#rev-name", "Bisi");
await page.fill("#rev-month", "November");
await page.fill("#rev-text", "A calm, beautiful stay from start to finish.");
const disabled = await page.$eval("form .ad-btn", (b) => b.disabled);
if (!disabled) fail("add-review enabled without consent tick");
await page.check("#rev-consent");
await page.click("form .ad-btn");
await page.waitForSelector("text=Bisi, stayed in November");
console.log("review added with consent");

// hide it → snapshot drops it
await page.click("text=Hide");
await page.waitForTimeout(600);
const snap2 = await page.evaluate(async () => (await fetch("/api/content")).json());
if (snap2.reviews.some((r) => r.firstName === "Bisi")) fail("hidden review still public");
else console.log("hide removes from snapshot");

// --- settings round-trip ---
await page.goto(`${BASE}/backoffice/settings`);
await page.waitForSelector("#set-wifi");
await page.fill("#set-wifi", "WestBrook Guest");
await page.fill("#set-wifipw", "lagos;2026");
await page.fill("#set-breakfast", "7 – 10 am");
await page.waitForSelector('img[alt="Wi-Fi QR preview"]');
console.log("QR preview renders");
await page.click("text=Save settings");
await page.waitForSelector("text=Saved");
await page.reload();
await page.waitForSelector("#set-wifi");
const wifiVal = await page.inputValue("#set-wifi");
if (wifiVal !== "WestBrook Guest") fail("settings did not round-trip");
else console.log("settings round-trip ok");

// cities cap: server rejects a 9th city
const capCheck = await page.evaluate(async () => {
  const s = await (await fetch("/api/admin/settings")).json();
  s.cities = Array.from({ length: 9 }, (_, i) => ({
    label: "C" + i,
    timezone: "Europe/Paris",
  }));
  const r = await fetch("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
  return r.status;
});
if (capCheck !== 400) fail("9-city settings should be rejected");
else console.log("city cap enforced");

// --- cleanup: delete Penthouse + Bisi review ---
await page.goto(`${BASE}/backoffice/rooms`);
await page.waitForSelector("text=Penthouse");
const editBtns = page.locator(".ad-row", { hasText: "Penthouse" }).locator("text=Edit");
await editBtns.first().click();
await page.click("text=Delete room");
await page.waitForTimeout(600);
await page.goto(`${BASE}/backoffice/reviews`);
await page.waitForSelector("text=Bisi");
await page.click("text=Delete");
await page.waitForTimeout(600);
console.log("cleanup done");

await browser.close();
console.log(failed ? "E2E FAILED" : "E2E PASSED");
process.exitCode = failed ? 1 : 0;
