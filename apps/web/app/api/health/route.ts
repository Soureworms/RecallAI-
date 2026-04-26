import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Skip live DB check when DATABASE_URL is not available (e.g. during next build
// static-generation phase). Calling prisma.$queryRaw() without a connection URL
// throws and pollutes build logs even though the error is caught below.
const CAN_CONNECT = !!process.env.DATABASE_URL

export async function GET() {
  let database: "connected" | "disconnected" = "connected"

  if (CAN_CONNECT) {
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      database = "disconnected"
    }
  } else {
    database = "disconnected"
  }

  const status = database === "connected" ? "ok" : "degraded"
  const httpStatus = database === "connected" ? 200 : 503

  return NextResponse.json(
    {
      status,
      version: process.env.npm_package_version ?? "unknown",
      database,
    },
    { status: httpStatus },
  )
}
