# WestBrook reception wall: native Android app (APK) brief

For a developer or an AI coding assistant. Read all of it first. The visual reference is `westbrook-wall-full-loop.html` (open it in a browser). Where this brief and the reference differ, the reference wins on how things look and this brief wins on how things behave.

## 1. What we are building

A reception display for WestBrook Hotel: three large portrait Android screens side by side, with small gaps between them. They are big tablet-style displays running regular Android (not Android TV, no remote). One APK is installed on all three. Each device is told once which position it has (left, middle or right). They play on their own, ignore touch, and are controlled by reception from a phone web page.

Each screen shows a full-screen photo slide. The three screens are one slide apart: left shows slide n, middle n+1, right n+2. All three change at the same moment every 8 seconds with a 600 ms cross-fade.

Version 1 is photos only. Video comes later (section 12).

## 2. Architecture

- **APK (this brief):** the player. Kotlin, Jetpack Compose, minSdk 24 (Android 7). Show the loop, the overlays and the messages. Nothing else.
- **Back end (also needed):** a small server with a JSON API, image storage and an admin web page for reception (section 9). If a back end already exists from the web-app brief, reuse it; the API is the same. Otherwise build it as PHP and MySQL, or any simple stack, over HTTPS.
- The APK polls the API about every 15 seconds. No websockets.
- The APK downloads images to local storage and plays from disk, so playback never waits for the network.

## 3. Setup on the device

- First run shows a setup screen (this is the only screen that accepts touch): server address, screen key, and position (left / middle / right). Save it. After that the app opens straight into the player.
- A long press of 5 seconds in the top-left corner, followed by a 4-digit PIN, reopens setup. Hide it otherwise.
- Starts automatically on boot (`RECEIVE_BOOT_COMPLETED`).
- Fullscreen, immersive mode, screen always on (`FLAG_KEEP_SCREEN_ON`), landscape lock off, portrait lock on.
- Kiosk lock: use lock task mode (Screen Pinning, or device owner via `dpm set-device-owner` for a full lock). Document both in the README, with the exact adb command.
- Ignore all touch in the player (consume every touch event).
- Auto-recover: a foreground service or watchdog restarts the app if it crashes or is closed.
- Battery and power: request ignoring battery optimisation.

## 4. Look

- Reference design size is 270 × 480. Scale everything with one factor: `screenWidth / 270`. Test at 1080 × 1920 and at 1200 × 1920.
- Fonts: Cormorant Garamond 600 (display) and DM Sans 400 and 500 (body), bundled in the APK.
- Default night theme: background #121722, text #f3ede2, gold #d6ab6a.
- Seasons: Christmas (1 December to 6 January: deep green #10302a, gold #e6c06f, garland, snow, green tint) and Independence Day (1 October only: green #0c3a25 with white accent and a tricolour stripe along the top of each screen). Dates are settings with these defaults, in the hotel timezone (default Africa/Lagos).
- No weather or temperature. No sound.

## 5. Slides and the loop

The loop always starts on the Welcome page. Order:

1. Welcome page: bold gold page with the hotel logo, WESTBROOK, HOTEL, "Welcome", "We're glad you're here".
2. Room slides: one slide per room photo. Room types are not fixed at three. Reception adds any number, each with a name, a price per night, photos, and an optional tag text such as "2 left tonight".
3. Other photo slides by tag, in this order: Pool terrace, Restaurant, Lobby, Gym, Bar. Several photos per tag are allowed.
4. Reviews page (one slide).
5. Good to know page (no photo): breakfast hours, checkout time, Wi-Fi QR code with the text "Scan for Wi-Fi". Build the QR from `WIFI:T:WPA;S:<name>;P:<password>;;`.

The hotel logo is an uploaded PNG or SVG that replaces the stand-in "W" everywhere. With no logo uploaded, show the hotel name as text.

Skipping rules (an absence must never be noticed):
- A room type or tag with no photos is skipped.
- The Reviews page is skipped when there are no visible reviews.
- The progress bar (one segment per active slide) and the loop length count only active slides.

Captions (dark footer card with a fade above it):
- Room types: name, big price in naira with "a night", optional tag.
- Restaurant: name and the line "Breakfast 7 – 10 am" (from settings).
- Pool, Lobby, Gym, Bar: name only.

Overlays that stay over every slide:
- Left screen: logo, WESTBROOK / HOTEL and a large greeting. Hidden while the left screen shows the Welcome page.
- Right screen: time card showing one city at a time (name, time, gold dot for day and grey dot for night). Changes city every 6 seconds. Default cities: Lagos (local), London, New York, Dubai, Tokyo. Editable, up to 8. Daytime is 06:00 to 17:59 in that city.
- Middle screen: nothing.

Greeting by hotel local time: Good morning 05:00 to 11:59, Good afternoon 12:00 to 16:59, Good evening 17:00 to 04:59. Seasonal themes replace it with "Merry Christmas" or "Happy Independence Day".

Reviews page: "Our guests say", five gold stars, the review in large serif type, first name and month of stay, and dots for which review is showing. Every 8 seconds it shows the next review (`reviewIndex = slot mod R`). With one review it stays.

## 6. Keeping the three screens in step

All timing comes from the server clock, never from the device clocks.

- At start and every 5 minutes, call `/api/time` 5 times, estimate `offset = serverTime - (clientSend + roundTrip/2)` for each, use the median.
- `t = System.currentTimeMillis() + offset`.
- The server provides a loop epoch `E`. `slot = floor((t - E) / 8000)`.
- Position `p` is 0, 1 or 2. Slide shown: `active[(slot + p) mod N]`.
- Time card city = `floor(t / 6000) mod cityCount`.
- When content changes, the server stamps it with `activateAt = now + 20 s`. Every device downloads all new images first, then switches at the first 8-second boundary after `activateAt`, so the three screens stay identical.
- Drive animation from the frame clock and compare to `t`; never count with a timer that drifts.
- Target: the three screens change within 0.3 seconds of each other.

## 7. Messages

- A message takes over all three screens at the same moment, showing the same thing on each, for 12 seconds (admin can set 8 to 30). All overlays hide during a message.
- With a picture: full-screen photo with the dark footer card holding a gold kicker, the name in large type, and the body. Without a picture: the bold gold page with the same text.
- When a message ends the loop restarts from the Welcome page: the server sets the loop epoch to the message end time.
- A message can be posted now or scheduled for a later time. One-off only.
- Fields: template, name (free text such as "Mr Okafor" or "Mr and Mrs Eze"), body (editable), optional picture, start time, duration.
- Three prewritten templates, all editable, and reception can write new ones (kicker, body, optional `{name}`):
  - Welcome back: "Welcome back to WestBrook, {name}. It is a pleasure to have you with us again."
  - Birthday: "Happy birthday, {name}. Everyone at WestBrook wishes you a wonderful day."
  - Wedding anniversary: "Happy anniversary, {name}. Wishing you many more years together. From all of us at WestBrook."

## 8. Offline and resilience

- Store the last content (JSON and images) on the device. If the network drops, keep playing it. The clock offset keeps working because the device clock keeps running.
- Never show a blank frame: preload the next two slides.
- If the player has not drawn a frame for 30 seconds, restart it.
- Update by APK: check `/api/app-version` on start; if newer, show nothing to guests and download the new APK for reception to install (document how). Keep this simple.

## 9. Back end and admin (phone web page, behind a login)

One shared reception password in version 1 (hashed, with a rate limit). Sections:

1. Photos: upload several at once, choose a room type or tag for each (required), delete. Preview cropped to 9:16. Warn if landscape or narrower than 1080 px. The server resizes to at most 1080 × 1920 JPEG.
2. Rooms: add, edit, reorder and delete room types (name, price, tag text, on or off). Start with Standard, Deluxe and Suite pre-created.
3. Reviews: first name, month of stay, text (about 120 characters), a required tick "Guest agreed to show this", hide, delete.
4. Messages: templates, write a new one, post or schedule.
5. Settings: hotel name, logo upload, timezone, local city label, cities list, breakfast hours, checkout time, Wi-Fi name and password, restaurant line, season dates and switches.

Tables: `photos`, `rooms`, `reviews`, `templates`, `messages`, `settings`, `meta` (content_version, activate_at, loop_epoch, app_version). Screens authenticate with a long random key. Uploads: images only, size limit, re-encoded on the server.

## 10. Security and privacy

- HTTPS only. Pin nothing exotic, but reject cleartext traffic (`usesCleartextTraffic=false`).
- Guests appear only as a title and surname, or the names reception types. Never show room numbers.
- Store the screen key in the app's private storage.

## 11. Phases (each ends with a plain-language report)

At the end of each phase, write a report of 15 lines or fewer: what works, what does not, what you decided and why, and any decision the owner must make. The owner does not read code or logs.

- **Phase 0, device test (about 1 day).** Minimal APK on all three screens: report make, model, Android version and resolution; show colour bars and a 1080 × 1920 image; show a big counter of `floor(t / 8000)` that flashes at each boundary and cross-fades; film the three screens together, they must change within 0.3 s of each other; unplug the network for 2 minutes and confirm it recovers; leave it 24 hours with no crash or memory growth. If any of these fail, stop and report.
- **Phase 1, player with fake data.** All slide types, overlays, greeting, time card, progress bar, themes, skipping rules, from a sample JSON file. Check each slide against the reference at 1080 × 1920.
- **Phase 2, back end and admin.** API, login, uploads, all admin sections. Check: a photo added from a phone appears on all three screens at the same 8-second boundary, about 20 seconds later.
- **Phase 3, sync, messages, seasons, offline.** A posted message appears on all three within 1 second of its start; a scheduled one waits; themes switch by date (test with a date override); pulling the network does not interrupt playback.
- **Phase 4, install and 7-day trial.** Kiosk lock, start on boot, auto-recovery, then a 7-day trial and a glitch report.

## 12. Out of scope for version 1

Video (in messages and in the loop), a picture or video running across all three screens, splitting one message across the screens, weather, live room availability, several admin users, repeating messages, other languages, sound, anything guests can touch.

When video is added later: 8 seconds in the loop (trimmed), up to 15 seconds in a message (minimum 12). Use Media3 ExoPlayer, muted, preloaded.

## 13. Already decided (do not ask again)

- Three large Android tablet-style screens, portrait, one per screen, touch ignored.
- Photos only for version 1.
- Independence Day on 1 October only. Christmas 1 December to 6 January.
- Reviews are added by hand with a "guest agreed" tick.
- Breakfast 7 – 10 am; pool, gym, lobby and bar show names only.
- Price on a dark card with a fade. No weather.
- The loop starts on the Welcome page. Real logo uploaded by reception. Any number of room types with name, price and pictures.
- Messages show the same on all three screens; splitting a message across screens is dropped.
- 8-second slides, 6-second time card, 12-second messages, 600 ms cross-fade.

## 14. What the owner will provide

Real portrait photos for each room type and place, the WestBrook logo file, Wi-Fi name and password, a domain and hosting, and three Android screens on the same network with internet access.
