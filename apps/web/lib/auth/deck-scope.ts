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

export function deckAccessWhereForRole(role: Role, userId: string, orgId: string, deckId: string) {
  return {
    id: deckId,
    orgId,
    isArchived: false,
    ...deckReadWhereForRole(role, userId),
  }
}

export function userTeamScopeWhereForRole(role: Role, userId: string) {
  if (role === "MANAGER") {
    return {
      teams: {
        some: {
          team: { members: { some: { userId } } },
        },
      },
    }
  }

  return {}
}
