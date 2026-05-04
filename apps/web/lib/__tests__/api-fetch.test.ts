import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { apiFetch } from "../api-fetch"

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}))

describe("apiFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("includes the server request id in user-facing error toasts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Card generation failed before drafts were created.",
            requestId: "req_generation_123",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      )
    )

    const result = await apiFetch("/api/decks/deck-1/generate", { method: "POST" })

    expect(result).toBeNull()
    expect(toast.error).toHaveBeenCalledWith(
      "Card generation failed before drafts were created. Reference: req_generation_123"
    )
  })
})
