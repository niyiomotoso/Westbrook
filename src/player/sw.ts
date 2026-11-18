/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Never auto-skipWaiting: the player activates updates only at a slide
  // boundary (R17). Registration-side code messages SKIP_WAITING when ready.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Content-hashed, immutable images: cache-first forever. This cache
      // is also the R27 pre-download target — "downloaded" and "cached"
      // are the same fact.
      matcher: ({ url }) => url.pathname.startsWith("/media/"),
      handler: new CacheFirst({ cacheName: "wall-media" }),
    },
    {
      // The poll and the clock must never be cached — the poller mirrors
      // the snapshot to storage itself, and a cached time skews clocks.
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

serwist.addEventListeners();
