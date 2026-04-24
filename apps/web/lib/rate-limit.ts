import { getRedis } from "@/lib/redis"

// ── In-memory fallback (used in dev without UPSTASH_REDIS_REST_URL) ───────────
type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of Array.from(store)) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60_000).unref()

function checkInMemory(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

// ── Upstash Redis REST implementation ─────────────────────────────────────────
async function checkUpstash(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis()!
  const k = `rl:${key}`
  const count = (await redis.incr(k)) as number
  if (count === 1) await redis.pexpire(k, windowMs)
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis()
  if (redis) {
    try {
      return await checkUpstash(key, limit, windowMs)
    } catch {
      // Redis error — fall back to in-memory so the app stays up
    }
  }
  return checkInMemory(key, limit, windowMs)
}
