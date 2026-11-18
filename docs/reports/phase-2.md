# Phase 2 report — the back office is live

What works:
- Reception can now run the wall from a phone at /backoffice, behind one
  password. Six sections sit on a bottom tab bar: Photos, Rooms, Reviews,
  Messages, Settings, Screens.
- Photos upload straight from the phone's gallery; they are trimmed to the
  screens' shape on the phone itself, so uploads are quick even on hotel
  Wi-Fi. A room or place with no photos shows a clear "won't appear in the
  loop" note instead of silently vanishing.
- Rooms can be added, edited, re-ordered with up/down buttons, switched off,
  and deleted. Reviews require the "guest agreed" tick before they can be
  saved. Settings covers the hotel name, logo, timezone, world-clock cities,
  breakfast and checkout lines, and the Wi-Fi details with a scannable
  preview of the QR code.
- Messages: pick a template (welcome back, birthday, anniversary), type the
  name once, optionally add a picture, post now or schedule. A posted
  message reached the screens within a blink of its planned moment in
  testing (5 thousandths of a second); double-booked messages are refused.
- A photo uploaded from a phone appeared on the wall at the same moment on
  every screen about 35 seconds later — the Phase 2 acceptance check.

Decision made: wrong-password guessing is slowed to 5 tries a minute, and
the reception password is machine-generated and long, which is stronger
than any typed one.
