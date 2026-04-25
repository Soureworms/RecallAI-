"use client"

import { useSession } from "next-auth/react"

const ROLE_RANK: Record<string, number> = {
  AGENT: 0,
  MANAGER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
}

export function usePermissions() {
  const { data: session } = useSession()
  const role = session?.user?.role ?? "AGENT"
  const rank = ROLE_RANK[role] ?? 0

  return {
    role,
    isSuperAdmin: role === "SUPER_ADMIN",
    isAdmin: rank >= ROLE_RANK.ADMIN,
    isManager: rank >= ROLE_RANK.MANAGER,
    canManageContent: rank >= ROLE_RANK.MANAGER && role !== "SUPER_ADMIN",
  }
}
