import { getRedis } from "@/lib/redis"

export type RouteClass = "read" | "write" | "ai_generation" | "auth"

export type RateLimitPolicy = {
  limit: number
  windowMs: number
}

export const RATE_LIMIT_POLICY_MAP: Record<RouteClass, RateLimitPolicy> = {
  read: { limit: 120, windowMs: 60_000 },
  write: { limit: 60, windowMs: 60_000 },
  ai_generation: { limit: 12, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 60_000 },
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: number
  source: "redis" | "memory"
}

// ── In-memory fallback (used in dev without UPSTASH_REDIS_REST_URL) ───────────
// NOTE: This store is process-local and not safe for shared global limits in a
// horizontally scaled deployment.
type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of Array.from(store)) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60_000).unref()

function checkInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, limit, resetAt, source: "memory" }
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, limit, resetAt: entry.resetAt, source: "memory" }
  }
  entry.count++
  return {
    allowed: true,
    remaining: limit - entry.count,
    limit,
    resetAt: entry.resetAt,
    source: "memory",
  }
}

async function checkUpstash(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const redis = getRedis()!
  const k = `rl:${key}`
  const count = (await redis.incr(k)) as number
  if (count === 1) await redis.pexpire(k, windowMs)
  const ttl = (await redis.pttl(k)) as number
  const resetAt = Date.now() + Math.max(0, ttl)
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    resetAt,
    source: "redis",
  }
}

export function getRateLimitPolicy(routeClass: RouteClass): RateLimitPolicy {
  return RATE_LIMIT_POLICY_MAP[routeClass]
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const redis = getRedis()
  if (redis) {
    try {
      return await checkUpstash(key, limit, windowMs)
    } catch {
      // Redis error — fall back to in-memory so the app stays up
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: Date.now() + windowMs,
      source: "memory",
    }
  }

  return checkInMemory(key, limit, windowMs)
}

export async function checkRateLimitWithPolicy(key: string, routeClass: RouteClass): Promise<RateLimitResult> {
  const policy = getRateLimitPolicy(routeClass)
  return checkRateLimit(key, policy.limit, policy.windowMs)
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    "X-RateLimit-Source": result.source,
  }
}
