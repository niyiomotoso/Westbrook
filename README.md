# WestBrook reception wall

Three portrait Android tablets playing a synchronized photo loop for the
WestBrook Hotel reception, with a phone back office. One Next.js monolith
on Cloudflare Workers (OpenNext) + D1 + KV, hosted entirely on free tiers.

- **Player (the wall):** https://westbrook-wall.westbrook-hotel.workers.dev/player
- **Back office:** https://westbrook-wall.westbrook-hotel.workers.dev/backoffice
- **Owner's guide:** [docs/RUNBOOK.md](docs/RUNBOOK.md)
- **Behavior spec:** [docs/WESTBROOK_ANDROID_APK_BRIEF.md](docs/WESTBROOK_ANDROID_APK_BRIEF.md) · **Visual law:** [docs/westbrook-wall-full-loop.html](docs/westbrook-wall-full-loop.html)
- **Sync model:** [docs/SYNC_MODEL.md](docs/SYNC_MODEL.md) · **Plan:** [docs/plans/](docs/plans/)
- **Standing rules:** [AGENTS.md](AGENTS.md) — main-only, zero budget, the reference design is law

## How it stays in step

Every screen derives what to render from `(server time, loop epoch,
content snapshot, position)` — nothing is counted locally. Clock sync is
NTP-over-fetch (median of 5 samples) anchored to `performance.now()`;
slides are 8s slots with a 600ms cross-fade; screens sit one slide apart.
Content edits stamp `activateAt = now + 30s` and every player switches at
the same 8-second boundary once its images are cached.

## Development

```bash
npm install
npm run db:migrate:local   # seed the local D1
npm run dev                # Turbopack dev (SW disabled) on :3000
npm test                   # vitest unit suite
npm run preview            # production build on workerd (real SW)
node e2e/<flow>.mjs        # Playwright end-to-end flows (dev server up)
```

Deploys: push to `main` → GitHub Actions runs tests, applies D1
migrations, builds with OpenNext, and deploys. There is no other deploy
path. Local secrets for dev live in `.dev.vars` (never committed).
