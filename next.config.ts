import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import withSerwistInit from "@serwist/next";

initOpenNextCloudflareForDev();

const withSerwist = withSerwistInit({
  swSrc: "src/player/sw.ts",
  swDest: "public/sw.js",
  // Precache the player document at SW install so a tablet that reboots
  // offline can still open the wall (R11). Revision ties it to the deploy.
  additionalPrecacheEntries: [
    { url: "/player", revision: process.env.BUILD_ID ?? "dev" },
  ],
});

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  env: {
    // Injected by the deploy workflow (github.sha); drives the player's
    // boundary-timed SW update check (R17).
    BUILD_ID: process.env.BUILD_ID ?? "dev",
  },
};

// Dev uses Turbopack (no SW); production builds run webpack via
// `next build --webpack`, where @serwist/next's injection works.
export default process.env.NODE_ENV === "development"
  ? nextConfig
  : withSerwist(nextConfig);
