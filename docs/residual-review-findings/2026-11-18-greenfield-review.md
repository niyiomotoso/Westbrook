# Residual review findings — 2026-11-18 full-codebase review

Source: 12-persona ce-code-review (run 20261118-024520-9c5c1ba6) over the
entire greenfield build (base = empty tree). 23 actionable findings were
applied in `fix(review)` commits, including both validator-confirmed P1s
(deploy-invisible ETag; service-worker update latch). The items below were
consciously NOT applied — accepted, deferred, or pushed back — so they are
recorded here rather than living only in the session.

## Deferred (worth a follow-up)

- P3 `app/api/admin/messages/route.ts` — canceled/expired message images and
  replaced logos are never deleted from KV (slow storage leak, bounded by
  1 GB free tier; extend the photo-purge pattern when it matters).
- P3 `migrations/0000_schema.sql` — no CHECK constraint enforcing the
  "exactly one of room_id/place_tag" photos invariant (app-layer only;
  add `CHECK ((room_id IS NULL) <> (place_tag IS NULL))` in a follow-up
  migration).
- P2 `app/backoffice/(authed)/messages/page.tsx` — datetime-local schedule
  times parse in the admin device's timezone, not hotel time (a visible
  hint was added; a timezone-converting picker is the real fix).
- Testing: no e2e exercises the 24h purge end-to-end, a one-image prefetch
  failure holding activation, or a /media 5xx degradation path.

## Accepted (by design or bounded)

- Opportunistic purge instead of a cron trigger (plan decision; runs on
  photo writes).
- Nightly 04:00 reload keys off the device clock, not corrected time (a
  badly wrong RTC shifts the maintenance reload; watchdog unaffected).
- `effectiveEpoch` may write meta from the public GET path (one write per
  ended message, bounded).
- KV put + D1 insert are non-transactional on upload (a failure between the
  two orphans one content-addressed blob; harmless, reused on re-upload).
- ScreensBanner renders nothing if D1 reads fail (admin page itself would
  error loudly anyway).
- buildSnapshot runs its query fan-out before the ETag compare (trivial at
  3-tablet scale; revisit only if polling scale grows 100x).
- SW NetworkFirst-vs-precache precedence on congested tablet Wi-Fi is
  believed bounded but unverified on real hardware — watch during the
  Phase 4 seven-day trial.

## Pushed back (reviewer suggestion rejected)

- "Delete app/player/proof/page.tsx": rejected — the Phase 0 owner report
  directs the owner to film the three real tablets on exactly that page;
  it is removed after the on-site device proof, not before.
