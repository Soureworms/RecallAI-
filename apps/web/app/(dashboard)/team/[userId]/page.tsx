"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft } from "lucide-react"
import { UserAnalytics } from "@/components/analytics/user-analytics"

export default function TeamMemberAnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  const [userName, setUserName] = useState<string>("")

  useEffect(() => {
    if (status === "loading") return
    const role = session?.user?.role as string | undefined
    if (!session?.user) return
    if (role !== "MANAGER" && role !== "ADMIN") {
      router.replace("/dashboard")
    }
  }, [session, status, router])

  useEffect(() => {
    if (!userId) return
    void fetch(`/api/analytics/user/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(() => {
        // name comes from teams list
      })
    void fetch("/api/teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((teams: { members: { user: { id: string; name: string } }[] }[]) => {
        for (const t of teams) {
          for (const m of t.members) {
            if (m.user.id === userId) {
              setUserName(m.user.name)
              return
            }
          }
        }
      })
  }, [userId])

  const role = session?.user?.role as string | undefined
  if (status === "loading") return null
  if (role !== "MANAGER" && role !== "ADMIN") return null

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
      <UserAnalytics
        userId={userId}
        title={userName ? `${userName}'s Analytics` : "Member Analytics"}
      />
    </div>
  )
}
