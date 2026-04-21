type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

// Prune stale entries every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of Array.from(store)) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60_000).unref()

export function checkRateLimit(
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

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}
