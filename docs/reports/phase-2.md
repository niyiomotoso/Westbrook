# Phase 2 report — the back office is live

What works:
- Reception runs the wall from a phone at /backoffice behind one password,
  with six tabs: Photos, Rooms, Reviews, Messages, Settings, Screens.
- Photos upload from the phone gallery and are trimmed to the screens'
  shape on the phone itself. Anything without photos shows a clear
  "won't appear in the loop" note instead of silently vanishing.
- Rooms: add, edit, re-order, switch off, delete. Reviews require the
  "guest agreed" tick. Settings covers name, logo, timezone, world-clock
  cities, breakfast/checkout lines, and Wi-Fi with a scannable QR preview.
- Messages: pick a template, type the name once, post now or schedule;
  double-booked messages are refused. The acceptance check passed: a photo
  from a phone appeared on every screen together ~35 seconds later.

Decision made: password guessing is limited to 5 tries a minute, and the
reception password is machine-generated and long.
