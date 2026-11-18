import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import withSerwistInit from "@serwist/next";

initOpenNextCloudflareForDev();

const withSerwist = withSerwistInit({
  swSrc: "src/player/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default withSerwist(nextConfig);
