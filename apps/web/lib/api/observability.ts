import { NextRequest, NextResponse } from "next/server"

type LogApiErrorInput = {
  code: string
  status: number
  requestId: string
  cause: unknown
  context?: Record<string, unknown>
}

type ApiErrorResponseInput = {
  code: string
  status: number
  message: string
  requestId?: string
  cause?: unknown
  context?: Record<string, unknown>
}

function fallbackRequestId(): string {
  return `req_${crypto.randomUUID()}`
}

export function getRequestId(req: NextRequest): string {
  return req.headers.get("x-request-id") || req.headers.get("x-vercel-id") || fallbackRequestId()
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }
  return {
    name: typeof error,
    message: String(error),
  }
}

export function logApiError(req: NextRequest, input: LogApiErrorInput) {
  console.error("[api.error]", {
    code: input.code,
    status: input.status,
    requestId: input.requestId,
    method: req.method,
    path: req.nextUrl.pathname,
    context: input.context,
    error: serializeError(input.cause),
  })
}

export function apiErrorResponse(req: NextRequest, input: ApiErrorResponseInput): NextResponse {
  const requestId = input.requestId ?? getRequestId(req)

  if (input.cause) {
    logApiError(req, {
      code: input.code,
      status: input.status,
      requestId,
      cause: input.cause,
      context: input.context,
    })
  }

  return NextResponse.json(
    {
      error: input.message,
      code: input.code,
      requestId,
    },
    {
      status: input.status,
      headers: { "x-request-id": requestId },
    }
  )
}
