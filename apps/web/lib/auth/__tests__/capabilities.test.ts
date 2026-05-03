import { describe, expect, it } from "vitest"

import {
  canAccessDashboardPath,
  canManageDeckContent,
  getNavItemsForRole,
} from "../capabilities"

describe("role capabilities", () => {
  it("shows agents only learner navigation", () => {
    expect(getNavItemsForRole("AGENT").map((item) => item.href)).toEqual([
      "/dashboard",
      "/review",
      "/settings",
    ])
  })

  it("shows managers study, content, team, and stats navigation", () => {
    expect(getNavItemsForRole("MANAGER").map((item) => item.href)).toEqual([
      "/dashboard",
      "/review",
      "/decks",
      "/team",
      "/stats",
      "/settings",
    ])
  })

  it("shows customer admins governance navigation without study or decks", () => {
    expect(getNavItemsForRole("ADMIN").map((item) => item.href)).toEqual([
      "/dashboard",
      "/team",
      "/org",
      "/stats",
      "/settings",
    ])
  })

  it("keeps super admins in platform navigation", () => {
    expect(getNavItemsForRole("SUPER_ADMIN").map((item) => item.href)).toEqual([
      "/admin",
      "/settings",
    ])
  })

  it("enforces dashboard route access by role", () => {
    expect(canAccessDashboardPath("AGENT", "/dashboard")).toBe(true)
    expect(canAccessDashboardPath("AGENT", "/review")).toBe(true)
    expect(canAccessDashboardPath("AGENT", "/decks")).toBe(false)
    expect(canAccessDashboardPath("AGENT", "/stats")).toBe(false)

    expect(canAccessDashboardPath("MANAGER", "/review")).toBe(true)
    expect(canAccessDashboardPath("MANAGER", "/decks")).toBe(true)
    expect(canAccessDashboardPath("MANAGER", "/team/settings")).toBe(true)
    expect(canAccessDashboardPath("MANAGER", "/org")).toBe(false)

    expect(canAccessDashboardPath("ADMIN", "/review")).toBe(false)
    expect(canAccessDashboardPath("ADMIN", "/decks")).toBe(false)
    expect(canAccessDashboardPath("ADMIN", "/org")).toBe(true)
    expect(canAccessDashboardPath("ADMIN", "/stats")).toBe(true)

    expect(canAccessDashboardPath("SUPER_ADMIN", "/admin")).toBe(true)
    expect(canAccessDashboardPath("SUPER_ADMIN", "/dashboard")).toBe(false)
  })

  it("limits deck content management to managers for the fast governance pass", () => {
    expect(canManageDeckContent("AGENT")).toBe(false)
    expect(canManageDeckContent("MANAGER")).toBe(true)
    expect(canManageDeckContent("ADMIN")).toBe(false)
    expect(canManageDeckContent("SUPER_ADMIN")).toBe(false)
  })
})
