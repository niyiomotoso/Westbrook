# WestBrook wall — owner's runbook

The wall lives at **https://westbrook-wall.westbrook-hotel.workers.dev**
The back office is **https://westbrook-wall.westbrook-hotel.workers.dev/backoffice**
(the reception password is held by the owner — it was handed over privately
at delivery and is never written in this repository).

Everything runs on free services. No subscriptions, no cards on file.

---

## Setting up a tablet (one-time, ~5 minutes each)

1. Charge the tablet and keep it plugged in permanently.
2. In Android **Settings → Display**, set screen timeout to the maximum.
   In **Settings → About tablet**, tap "Build number" seven times to unlock
   Developer options, then in **Settings → Developer options** turn on
   **Stay awake** (screen never sleeps while charging).
3. In **Settings → Apps → Chrome → Battery**, choose **Unrestricted**.
4. Open **Chrome** and go to `westbrook-wall.westbrook-hotel.workers.dev/player`
5. The setup screen appears. Pick this screen's position on the wall
   (**Left**, **Middle**, or **Right**), choose a 4-digit PIN (the same PIN
   on all three screens is fine), and tap **Start the wall**.
6. In Chrome's menu (⋮) choose **Install and create shortcut** (it may say
   "Install page as app"), then **Install**. Close Chrome, find the
   **WestBrook** icon on the home screen, and open it — it fills the whole
   screen with no browser bars.
7. Pin it so stray touches can't leave the app: **Settings → Security →
   Screen pinning** → on, then open the app switcher, tap the WestBrook
   icon at the top of its card, and choose **Pin**.

Repeat for all three tablets, picking the right position for each.

**Optional (recommended):** install the free **Fully Kiosk Browser** app
instead of Chrome for the player and set its Start URL to the player
address with autostart-on-boot switched on. That makes the wall come back
by itself after a power cut. Its advanced lockdown features are paid — do
not buy them; Screen Pinning above does that job for free.

---

## Everyday use (reception)

- Open the back office on any phone or laptop and sign in.
- **Photos**: upload room and place photos; anything without a photo simply
  stays out of the loop. **Rooms**: prices, tags, order, on/off.
  **Reviews**: add with the guest's permission tick. **Messages**: pick a
  template, type the name, post — it appears on all three screens about 30
  seconds later; schedule future ones the same way. **Settings**: logo,
  Wi-Fi, breakfast/checkout lines, cities, seasonal dates.
- **Screens** shows each screen's health. "Silent" means that tablet lost
  power or Wi-Fi, or the app was closed.

## If something looks wrong

| Problem | Do this |
|---|---|
| One screen is frozen | Wait 60 seconds — it restarts itself. Still stuck? Unpin (hold Back + Recents), close and reopen the WestBrook app. |
| A screen is dark | Check the charger and the wall socket, then reopen the app. |
| After a power cut | Tablets restart but the app does not open itself (unless Fully Kiosk is used). Tap the WestBrook icon on each tablet once. |
| Wall shows old content | It updates about 45 seconds after a change. Longer? Check the hotel Wi-Fi. |
| Screens out of step | They re-align themselves within a minute of the network returning. |
| Forgot the reception password | The owner can reset it (one command for the technical contact: `wrangler secret put ADMIN_PASSWORD`). |
| Need setup again on a tablet | Press and hold a finger in the very top-left corner for 5 seconds, then enter the tablet's PIN. |

## The 7-day trial (Phase 4)

Run the wall for a week. Note anything odd in a simple log: date, time,
which screen, what happened, what fixed it. The things worth watching:
screens drifting out of step, a frozen or dark screen, content not
updating, and whether the morning/afternoon/evening greeting matches the
clock. Share the log at the end of the week.

## Free-plan usage (checked November 2026)

Typical day: about 26,000 of the 100,000 free requests; photo storage a
few percent of the free 1 GB; database far under every limit. If Cloudflare
ever emails about limits, share that email with the technical contact —
do not add a card.
