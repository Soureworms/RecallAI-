import IORedis from "ioredis"

const g = globalThis as unknown as { _redis?: IORedis }

export function getRedis(): IORedis | null {
  if (!process.env.REDIS_URL) return null
  if (!g._redis) {
    g._redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
    g._redis.on("error", (err: Error) => {
      if (process.env.NODE_ENV !== "test") {
        console.error("[redis] connection error:", err.message)
      }
    })
  }
  return g._redis
}
