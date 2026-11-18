import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import withSerwistInit from "@serwist/next";

initOpenNextCloudflareForDev();

const withSerwist = withSerwistInit({
  swSrc: "src/player/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

// Dev uses Turbopack (no SW); production builds run webpack via
// `next build --webpack`, where @serwist/next's injection works.
export default process.env.NODE_ENV === "development"
  ? nextConfig
  : withSerwist(nextConfig);
