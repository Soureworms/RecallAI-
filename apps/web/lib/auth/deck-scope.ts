import type { Role } from "@/lib/auth/roles"

export function deckReadWhereForRole(role: Role, userId: string) {
  if (role === "AGENT") {
    return { assignments: { some: { userId } } }
  }

  if (role === "MANAGER") {
    return {
      OR: [
        { createdById: userId },
        { assignments: { some: { userId } } },
        { assignments: { some: { team: { members: { some: { userId } } } } } },
      ],
    }
  }

  return {}
}
