import { createWorker } from "./lib/queue/processor"

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error("[worker] REDIS_URL is not set. Exiting.")
  process.exit(1)
}

const worker = createWorker(redisUrl)
console.log("[worker] Card generation worker started. Waiting for jobs…")

async function shutdown() {
  console.log("[worker] Shutting down gracefully…")
  await worker.close()
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
