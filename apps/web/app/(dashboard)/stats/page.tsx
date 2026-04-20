"use client"

import { useSession } from "next-auth/react"
import { UserAnalytics } from "@/components/analytics/user-analytics"

export default function MyStatsPage() {
  const { data: session, status } = useSession()

  if (status === "loading") return null
  if (!session?.user?.id) return null

  return <UserAnalytics userId={session.user.id} title="My Learning Stats" />
}
