import type { Role } from "@/lib/auth/roles"

export type StatsSections = {
  showOrg: boolean
  showDocuments: boolean
  showPersonal: boolean
  showTeamGuidance: boolean
}

export function getStatsSectionsForRole(role: Role): StatsSections {
  if (role === "MANAGER") {
    return {
      showOrg: false,
      showDocuments: true,
      showPersonal: true,
      showTeamGuidance: true,
    }
  }

  if (role === "ADMIN") {
    return {
      showOrg: true,
      showDocuments: true,
      showPersonal: false,
      showTeamGuidance: false,
    }
  }

  return {
    showOrg: false,
    showDocuments: false,
    showPersonal: false,
    showTeamGuidance: false,
  }
}
