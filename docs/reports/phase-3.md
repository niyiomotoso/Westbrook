# Phase 3 report — messages, seasons, offline, self-healing

What works:
- A posted message appeared on the screens 5 thousandths of a second from
  its planned moment — far inside the 1-second target. Scheduled messages
  wait their turn; two messages can never double-book; a message can't be
  cancelled in its final 30 seconds (screens may already be counting down
  to it). After a message, the loop restarts from the Welcome page.
- Christmas and Independence Day looks switch by date and were tested with
  an override; the greeting follows the hotel clock through morning,
  afternoon, and evening.
- The network was cut while the wall played: the loop carried on without a
  flicker. The page was then force-reloaded while still offline: the wall
  came back by itself from its local copy and kept playing. When the
  network returned, everything re-synced within a poll.
- Each tablet now has a first-run setup (Left / Middle / Right and a PIN).
  The wall ignores all touch; only a hidden 5-second press in the top-left
  corner plus the PIN reopens setup. The screen keeps itself awake,
  restarts itself if it ever freezes for 30 seconds, and does a quiet
  self-refresh at 4 a.m. daily.
- New versions of the software reach running screens by themselves and
  swap in at a slide change, hidden inside the dark cross-fade.

What does not work yet: nothing open; Phase 4 is installation on the real
tablets and the 7-day trial, which needs the hardware.
