# Phase 1 report — the player with sample content

What works:
- All slide types now play exactly like the design: the gold Welcome page, each room with its price card (with the "2 left tonight" style tag), the five places with their captions, the guest-reviews page, and the Good to know page with a scannable Wi-Fi code.
- The left screen carries the hotel name and a greeting that changes with the time of day; the right screen shows the rotating world clock; the middle stays clean — all per the design.
- Christmas and Independence Day looks switch on by date automatically and were tested with a date override.
- Guest messages (welcome back, birthday, anniversary) take over the screen in both styles — with a photo, and on the gold page — then the loop restarts from Welcome.
- Screens were compared side by side against the design file; they match, including fonts, colours, and spacing. On a tablet that is slightly wider than the design (1200 px class), the picture stays correct with a slim dark border instead of stretching.

What does not work yet: the content is a built-in sample; reception cannot change it until Phase 2 (the back office).

Decision made: a fix was applied to the design's review-rotation maths, which could get stuck repeating the same reviews for some photo counts. Now one review travels across the wall per loop, and every review always gets shown.
