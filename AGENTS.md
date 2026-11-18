# Westbrook — rules for agents and contributors

## What this project is

A reception display system for WestBrook Hotel: three portrait Android tablets side by side showing a synchronized photo loop, controlled from a back office page. Full behavior spec: `docs/WESTBROOK_ANDROID_APK_BRIEF.md` (the platform sections about an APK are superseded — see below — but all behavior, timing, content, and visual rules in it still apply). Visual reference: `docs/westbrook-wall-full-loop.html`.

## Architecture (decided 2026-11-18, supersedes the APK plan in the brief)

- One **Next.js monolith** in this repo. No separate backend, no APK.
- **Player**: the customer-facing screens, installed on Android tablets as a PWA via Chrome "Install page as app". Fullscreen, portrait, Screen Wake Lock, touch ignored, offline-capable via service worker.
- **Back office**: `/backoffice`, behind a single shared reception login. Operated from a phone or laptop.
- **Hosting**: Cloudflare Workers via the OpenNext adapter. **Database**: Cloudflare D1 (SQLite). **Images**: Cloudflare Workers KV (R2 requires a dashboard enablement that prompts for a payment card — KV needs neither and fits the workload: ≤2 MB images vs 25 MB value cap, ~1 k writes/day free vs rare uploads, images cached on-device after one read). Swap to R2 later only if the owner enables it.
- **Deploys**: automatic on every push to `main` via GitHub Actions + wrangler, using the Cloudflare API token stored as a repo secret. No manual deploy steps in the normal flow. The Cloudflare account's workers.dev subdomain is `westbrook-hotel.workers.dev`.

## Standing rules

0. **The reference design is law.** `docs/westbrook-wall-full-loop.html` is the product owner's exact design — replicate it to the letter. Extract real CSS values (colors, fonts, sizes, layout) from that file; never reinterpret, restyle, or "improve" it. Scale from the 270×480 design size by one factor (`screenWidth / 270`) and verify every slide type against the reference at 1080×1920. Where the brief and the reference differ: reference wins on looks, brief wins on behavior.

1. **All work happens on `main`. Never create or work on any other branch.** No feature branches, no PRs. Push to `main` deploys to production.
2. **Zero budget.** Every service, tier, and tool must be entirely free. Never introduce anything that requires payment or a credit card. If a free tier limit threatens the design, raise it instead of upgrading.
3. Everything lives in this one repo — player, back office, API, schema, docs.
4. Phase reports for the owner are plain language, 15 lines or fewer, no code or logs (see brief, section 11).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
