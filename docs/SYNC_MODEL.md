# WestBrook wall sync model

The one invariant everything rests on:

> **At any instant, any player derives exactly what to render from
> `(t, E, snapshot, position)` — corrected server time, the loop epoch,
> the latest content snapshot, and its own position. Zero accumulated
> local state.**

Reload, sleep/wake, boot mid-message, and late polls all recover for free
because nothing is counted locally — everything is a pure function of time.

## Corrected time `t`

- `GET /api/time` returns `{ now }` with `Cache-Control: no-store`.
- At boot and every 5 minutes: take 5 samples; per sample
  `offset = serverNow + rtt/2 − receivedAt`; keep the **median**.
- The clock anchors to `performance.now()` (monotonic — immune to OS clock
  steps): `t = performance.now() + perfOffset`.
- Corrections `< 250 ms` slew linearly over 3 s; larger ones **snap only at
  an 8-second boundary**.
- The latest offset is also persisted **relative to `Date.now()`** in
  localStorage. A device booting with no network seeds
  `t ≈ Date.now() + persistedOffset` (best-effort on the device RTC — the
  one stated exception to "never device clocks"), then re-anchors on the
  first successful sync.

## The loop

- `slot = floor((t − E) / 8000)`; `t < E` clamps to slot 0 (Welcome).
- Slide shown by a screen: `active[(slot + position) mod N]`, floored modulo.
- `active` is the ordered slide list derived from the snapshot by
  `buildActiveSlides` (skipping rules live there).
- Cross-fade: the last 600 ms of each slot.
- Review index: `floor((slot + position) / N) mod R` — advances exactly one
  review per loop pass and can never freeze for any (N, R). One review
  sweeps across the wall per pass.
- Time card city: `floor(t / 6000) mod cityCount` (absolute time, not epoch).

## The poll contract

`GET /api/content` returns **one idempotent full snapshot** every 15 s
(ETag `"v{n}"` + `If-None-Match` → tiny 304s; `Cache-Control: no-store`):

- content (rooms, photos, reviews, settings, templates)
- `loop_epoch` E — **rides every poll**; a device that slept through an
  epoch reset adopts the new E at its next boundary and self-heals
- `content_version` and `activateAt`
- the active message, and any scheduled message within 60 s of its start
  (earlier than that, scheduled messages stay admin-only — guest names must
  not leak hours before display)
- `build_id` — a new value triggers the boundary-timed SW update

## Activation

- Every admin write stamps `activateAt = now + 30 s` (covers worst-case
  15 s poll staleness + pre-download time). Consecutive edits coalesce —
  the latest version wins; intermediates never activate.
- A player switches to a new snapshot at the **first 8-second boundary
  after `activateAt` AND after all its images are cached**. Not ready →
  hold the old snapshot; switch at the first boundary after ready.
  Brief stale-content divergence is acceptable; blank frames are not.

## Messages

- "Post now" is stamped `startAt = now + 30 s`; scheduled needs ≥ 30 s lead;
  overlapping windows are rejected; cancel is forbidden within 30 s of start.
- Message mode is **derived**: `startAt ≤ t < startAt + duration`.
- After the window, the server reports `loop_epoch = startAt + duration`
  (computed on read — no cron), so the loop restarts on Welcome everywhere.
- A message's end is a loop boundary for pending `activateAt` content.
