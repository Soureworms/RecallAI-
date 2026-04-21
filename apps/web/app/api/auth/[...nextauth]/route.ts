import { handlers } from "@/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

export const GET = handlers.GET

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"

  const { allowed } = checkRateLimit(`auth:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please try again in a minute." },
      { status: 429 }
    )
  }

  return handlers.POST(req)
}
