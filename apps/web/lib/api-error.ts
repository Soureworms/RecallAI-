import { NextResponse } from "next/server"

/** Wraps a route handler, catching unexpected errors and returning 500. */
export function withErrorHandler(
  handler: (...args: unknown[]) => Promise<NextResponse>,
  label: string
) {
  return async (...args: unknown[]) => {
    try {
      return await handler(...args)
    } catch (err) {
      console.error(`[${label}]`, err)
      return NextResponse.json(
        { error: "An unexpected error occurred" },
        { status: 500 }
      )
    }
  }
}
