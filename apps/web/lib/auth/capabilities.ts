import type { Role } from "@/lib/auth/roles"

export type NavItemKey =
  | "dashboard"
  | "study"
  | "decks"
  | "team"
  | "organisation"
  | "stats"
  | "settings"
  | "platform-admin"

export type NavItemDefinition = {
  key: NavItemKey
  href: string
  label: string
}

const NAV_ITEMS: Record<NavItemKey, NavItemDefinition> = {
  dashboard: { key: "dashboard", href: "/dashboard", label: "Dashboard" },
  study: { key: "study", href: "/review", label: "Study" },
  decks: { key: "decks", href: "/decks", label: "Decks" },
  team: { key: "team", href: "/team", label: "Team" },
  organisation: { key: "organisation", href: "/org", label: "Organisation" },
  stats: { key: "stats", href: "/stats", label: "Stats" },
  settings: { key: "settings", href: "/settings", label: "Settings" },
  "platform-admin": { key: "platform-admin", href: "/admin", label: "Platform Admin" },
}

const ROLE_NAV: Record<Role, NavItemKey[]> = {
  AGENT: ["dashboard", "study", "settings"],
  MANAGER: ["dashboard", "study", "decks", "team", "stats", "settings"],
  ADMIN: ["dashboard", "team", "organisation", "stats", "settings"],
  SUPER_ADMIN: ["platform-admin", "settings"],
}

export function getNavItemsForRole(role: Role): NavItemDefinition[] {
  return ROLE_NAV[role].map((key) => NAV_ITEMS[key])
}

export function canStudy(role: Role): boolean {
  return role === "AGENT" || role === "MANAGER"
}

export function canManageDeckContent(role: Role): boolean {
  return role === "MANAGER"
}

export function canViewTeamWorkspace(role: Role): boolean {
  return role === "MANAGER" || role === "ADMIN"
}

export function canViewStats(role: Role): boolean {
  return role === "MANAGER" || role === "ADMIN"
}

export function canManageOrgUsers(role: Role): boolean {
  return role === "ADMIN"
}

function matchesPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

export function canAccessDashboardPath(role: Role, pathname: string): boolean {
  if (matchesPath(pathname, "/settings")) return true

  if (role === "SUPER_ADMIN") {
    return matchesPath(pathname, "/admin")
  }

  if (matchesPath(pathname, "/dashboard")) return true
  if (matchesPath(pathname, "/review")) return canStudy(role)
  if (matchesPath(pathname, "/decks")) return canManageDeckContent(role)
  if (matchesPath(pathname, "/team")) return canViewTeamWorkspace(role)
  if (matchesPath(pathname, "/stats")) return canViewStats(role)
  if (matchesPath(pathname, "/org")) return canManageOrgUsers(role)
  if (matchesPath(pathname, "/admin")) return false

  return true
}

export function defaultPathForRole(role: Role): string {
  if (role === "SUPER_ADMIN") return "/admin"
  return "/dashboard"
}
