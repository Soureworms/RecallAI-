"use client"

import { useSession } from "next-auth/react"
import { UserAnalytics } from "@/components/analytics/user-analytics"
import { OrgAnalytics } from "@/components/analytics/org-analytics"

const ROLE_RANK: Record<string, number> = { AGENT: 0, MANAGER: 1, ADMIN: 2, SUPER_ADMIN: 3 }

export default function MyStatsPage() {
  const { data: session, status } = useSession()

  if (status === "loading") return null
  if (!session?.user?.id) return null

  const role = session.user.role ?? "AGENT"
  const isAdmin = (ROLE_RANK[role] ?? 0) >= ROLE_RANK.ADMIN

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {isAdmin && <OrgAnalytics />}
        <UserAnalytics userId={session.user.id} title={isAdmin ? "My Learning Stats" : undefined} />
      </div>
    </div>
  )
}
