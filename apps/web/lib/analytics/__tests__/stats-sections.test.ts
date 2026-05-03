import { describe, expect, it } from "vitest"

import { getStatsSectionsForRole } from "../stats-sections"

describe("getStatsSectionsForRole", () => {
  it("shows managers team guidance, source file performance, and their own study stats", () => {
    expect(getStatsSectionsForRole("MANAGER")).toEqual({
      showOrg: false,
      showDocuments: true,
      showPersonal: true,
      showTeamGuidance: true,
    })
  })

  it("shows customer admins governance stats without personal learning stats", () => {
    expect(getStatsSectionsForRole("ADMIN")).toEqual({
      showOrg: true,
      showDocuments: true,
      showPersonal: false,
      showTeamGuidance: false,
    })
  })

  it("does not expose stats sections to agent or super admin roles", () => {
    expect(getStatsSectionsForRole("AGENT")).toEqual({
      showOrg: false,
      showDocuments: false,
      showPersonal: false,
      showTeamGuidance: false,
    })
    expect(getStatsSectionsForRole("SUPER_ADMIN")).toEqual({
      showOrg: false,
      showDocuments: false,
      showPersonal: false,
      showTeamGuidance: false,
    })
  })
})
