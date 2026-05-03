"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { UserAnalytics } from "@/components/analytics/user-analytics"
import { OrgAnalytics } from "@/components/analytics/org-analytics"
import { DocumentAnalytics } from "@/components/analytics/document-analytics"
import { assertRole } from "@/lib/auth/roles"
import { getStatsSectionsForRole } from "@/lib/analytics/stats-sections"

export default function MyStatsPage() {
  const { data: session, status } = useSession()

  if (status === "loading") return null
  if (!session?.user?.id) return null

  const role = assertRole(session.user.role ?? "AGENT", "session user role")
  const sections = getStatsSectionsForRole(role)

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-1">
            {role === "ADMIN" ? "Organisation Stats" : "Team Stats"}
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            {role === "ADMIN"
              ? "Governance-level rollups across your organisation."
              : "Team performance lives in Team Analytics; your own practice stats are below."}
          </p>
        </div>

        {sections.showTeamGuidance && (
          <div className="mb-8 rounded-xl border border-ink-6 bg-paper-raised p-5 shadow-s1">
            <h2 className="text-sm font-semibold text-ink-2">Team and member analytics</h2>
            <p className="mt-1 text-sm text-ink-3">
              View team retention, answer-match scores, completion, and member-level detail from the Team workspace.
            </p>
            <Link
              href="/team"
              className="mt-4 inline-flex rounded-lg bg-ink-1 px-4 py-2 text-sm font-semibold text-paper"
            >
              Open Team Analytics
            </Link>
          </div>
        )}

        {sections.showOrg && <OrgAnalytics />}
        {sections.showDocuments && <DocumentAnalytics />}
        {sections.showPersonal && <UserAnalytics userId={session.user.id} title="My Learning Stats" />}
      </div>
    </div>
  )
}
