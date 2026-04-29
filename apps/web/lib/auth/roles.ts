export const ROLES = ["AGENT", "MANAGER", "ADMIN", "SUPER_ADMIN"] as const

export type Role = typeof ROLES[number]

export const ROLE_RANK: Record<Role, number> = {
  AGENT: 0,
  MANAGER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role)
}

export function assertRole(value: unknown, context = "role"): Role {
  if (!isRole(value)) {
    throw new Error(`Invalid ${context}: ${String(value)}`)
  }
  return value
}
