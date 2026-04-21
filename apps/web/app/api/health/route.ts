import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  let database: "connected" | "disconnected" = "connected"
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
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
    { status: httpStatus }
  )
}
