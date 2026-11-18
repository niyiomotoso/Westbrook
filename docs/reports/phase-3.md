# Phase 3 report — messages, seasons, offline, self-healing

What works:
- A posted message hit the screens 5 thousandths of a second from its
  planned moment (target: within 1 second). Scheduled ones wait their
  turn; after any message the loop restarts from the Welcome page.
- Christmas and Independence Day looks switch by date (tested with an
  override); the greeting follows the hotel clock through the day.
- The network was cut mid-play: the loop carried on. The page was then
  force-reloaded while still offline: the wall came back from its local
  copy and kept playing, then re-synced when the network returned.
- Each tablet has a first-run setup (position + PIN). The wall ignores all
  touch except a hidden 5-second corner press with the PIN. Screens keep
  themselves awake, restart if frozen 30 seconds, and self-refresh nightly.
- New software reaches running screens by itself, swapping in at a slide
  change. Nothing is open; Phase 4 is installation plus the 7-day trial.
