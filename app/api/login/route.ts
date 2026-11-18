import {
  SESSION_MAX_AGE_S,
  clearSessionCookie,
  passwordMatches,
  sessionCookie,
  signSession,
} from "@/lib/auth";
import { getEnv } from "@/server/db";
import { checkRateLimit, tooManyRequests } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const env = getEnv();
  if (!(await checkRateLimit(env.LOGIN_RL, request))) {
    return tooManyRequests();
  }

  const adminPassword = env.ADMIN_PASSWORD;
  const secret = env.SESSION_SECRET;
  if (!adminPassword || !secret) {
    return new Response("auth not configured", { status: 503 });
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";

  if (!(await passwordMatches(password, adminPassword))) {
    // small constant delay: defense in depth alongside the rate limit
    await new Promise((r) => setTimeout(r, 300));
    return new Response("wrong password", { status: 401 });
  }

  const now = Date.now();
  const token = await signSession(secret, {
    iat: now,
    exp: now + SESSION_MAX_AGE_S * 1000,
  });
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": sessionCookie(token) },
  });
}

export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearSessionCookie() },
  });
}
