# Phase 0 report — pipeline and sync proof

What works:
- The wall now lives on the internet at westbrook-wall.westbrook-hotel.workers.dev, hosted entirely on free services, with no card on file anywhere.
- Every change pushed to the project automatically tests and publishes itself within about two minutes. Nobody runs deployments by hand.
- The "heartbeat" that keeps three screens in step is built and proven: a test page shows a big counter that flips every 8 seconds, driven by the server's clock, not the tablet's. Opened side by side in three browser windows, the counters flip together.
- If the network drops, a screen keeps its own corrected clock and recovers when the network returns.

What does not work yet: nothing is broken; content, admin, and offline features come in later phases.

Decision made: photos will be stored in a different free Cloudflare service (KV) than first planned (R2), because enabling R2 asks for a payment card. Nothing changes for how the wall looks or is used.

For the owner to do at install time (not now): open the test page on the three real tablets side by side and film them flipping together — the final proof on real hardware.
