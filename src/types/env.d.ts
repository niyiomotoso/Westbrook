/// <reference types="@cloudflare/workers-types" />

/**
 * Bindings from wrangler.jsonc. Hand-maintained (instead of the generated
 * cloudflare-env.d.ts) so CI type-checking needs no codegen step.
 */

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    MEDIA: KVNamespace;
    ASSETS: Fetcher;
    WORKER_SELF_REFERENCE: Fetcher;
    LOGIN_RL: RateLimitBinding;
    PUBLIC_RL: RateLimitBinding;
    ADMIN_PASSWORD?: string;
    SESSION_SECRET?: string;
    NEXTJS_ENV?: string;
  }
}

export {};
