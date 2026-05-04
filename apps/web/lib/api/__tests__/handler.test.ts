import { describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { withHandlerSimple } from "../handler"

describe("API error handler", () => {
  it("logs unexpected failures with a request id and returns a traceable error response", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const req = new NextRequest("http://localhost/api/example", {
      method: "POST",
      headers: { "x-request-id": "req_test_123" },
    })
    const handler = withHandlerSimple(async () => {
      throw new Error("database unavailable")
    })

    const res = await handler(req)

    expect(res.status).toBe(500)
    expect(res.headers.get("x-request-id")).toBe("req_test_123")
    await expect(res.json()).resolves.toEqual({
      error: "Something went wrong. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
      requestId: "req_test_123",
    })
    expect(consoleError).toHaveBeenCalledWith(
      "[api.error]",
      expect.objectContaining({
        code: "INTERNAL_SERVER_ERROR",
        method: "POST",
        path: "/api/example",
        requestId: "req_test_123",
        status: 500,
        error: expect.objectContaining({
          message: "database unavailable",
          name: "Error",
        }),
      })
    )

    consoleError.mockRestore()
  })

  it("passes successful responses through unchanged", async () => {
    const req = new NextRequest("http://localhost/api/example")
    const handler = withHandlerSimple(async () =>
      NextResponse.json({ ok: true }, { status: 201 })
    )

    const res = await handler(req)

    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toEqual({ ok: true })
  })
})
