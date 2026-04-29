import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/redis", () => ({ getRedis: () => null }))

describe("rate limit policy map", async () => {
  const { checkRateLimitWithPolicy } = await import("@/lib/rate-limit")

  it("enforces stricter ai_generation policy independently from read", async () => {
    const aiKey = `test-ai-${crypto.randomUUID()}`
    const readKey = `test-read-${crypto.randomUUID()}`

    for (let i = 0; i < 12; i++) {
      const result = await checkRateLimitWithPolicy(aiKey, "ai_generation")
      expect(result.allowed).toBe(true)
    }
    const blocked = await checkRateLimitWithPolicy(aiKey, "ai_generation")
    expect(blocked.allowed).toBe(false)

    const readResult = await checkRateLimitWithPolicy(readKey, "read")
    expect(readResult.allowed).toBe(true)
    expect(readResult.remaining).toBe(119)
  })

  it("keeps auth policy independent from write policy", async () => {
    const authKey = `test-auth-${crypto.randomUUID()}`
    const writeKey = `test-write-${crypto.randomUUID()}`

    for (let i = 0; i < 10; i++) {
      const authResult = await checkRateLimitWithPolicy(authKey, "auth")
      expect(authResult.allowed).toBe(true)
    }
    expect((await checkRateLimitWithPolicy(authKey, "auth")).allowed).toBe(false)

    expect((await checkRateLimitWithPolicy(writeKey, "write")).allowed).toBe(true)
  })
})
