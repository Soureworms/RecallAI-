import { NextRequest, NextResponse } from "next/server"

type Handler<P = Record<string, never>> = (
  req: NextRequest,
  ctx: { params: P }
) => Promise<NextResponse>

/**
 * Wraps an API route handler with consistent error handling.
 * Unhandled exceptions are caught, logged, and returned as 500 JSON responses
 * instead of crashing the route or leaking internal details.
 */
export function withHandler<P = Record<string, never>>(fn: Handler<P>): Handler<P> {
  return async (req: NextRequest, ctx: { params: P }): Promise<NextResponse> => {
    try {
      return await fn(req, ctx)
    } catch (err) {
      console.error(`[API] ${req.method} ${req.nextUrl.pathname}`, err)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}

/** Convenience for routes with no dynamic params. */
export function withHandlerSimple(
  fn: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await fn(req)
    } catch (err) {
      console.error(`[API] ${req.method} ${req.nextUrl.pathname}`, err)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}
