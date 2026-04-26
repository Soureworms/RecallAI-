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
  const isManager = (ROLE_RANK[role] ?? 0) >= ROLE_RANK.MANAGER

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {isManager && <OrgAnalytics />}
        <UserAnalytics userId={session.user.id} title={isManager ? "My Learning Stats" : undefined} />
      </div>
    </div>
  )
}
