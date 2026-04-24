import { getRedis } from "@/lib/redis"

// ── In-memory fallback (used when REDIS_URL is not set) ───────────────────────
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

// ── Redis-backed implementation ───────────────────────────────────────────────
async function checkRedis(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis()!
  const k = `rl:${key}`
  const count = await redis.incr(k)
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
      return await checkRedis(key, limit, windowMs)
    } catch {
      // Redis error — fall through to in-memory so the app stays up
    }
  }
  return checkInMemory(key, limit, windowMs)
}
