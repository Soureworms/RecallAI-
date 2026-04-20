"use client"

import { useSession } from "next-auth/react"

type Role = "ADMIN" | "MANAGER" | "AGENT"

const ROLE_RANK: Record<Role, number> = {
  AGENT: 0,
  MANAGER: 1,
  ADMIN: 2,
}

export function usePermissions() {
  const { data: session } = useSession()
  const role = (session?.user?.role ?? "AGENT") as Role
  const rank = ROLE_RANK[role] ?? 0

  return {
    role,
    isManager: rank >= ROLE_RANK.MANAGER,
    isAdmin: rank >= ROLE_RANK.ADMIN,
    canManageContent: rank >= ROLE_RANK.MANAGER,
  }
}
