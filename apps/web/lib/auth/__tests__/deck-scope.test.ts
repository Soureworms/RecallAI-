import { describe, expect, it } from "vitest"

import { deckReadWhereForRole } from "../deck-scope"

describe("deck team scope filters", () => {
  it("limits agents to directly assigned decks", () => {
    expect(deckReadWhereForRole("AGENT", "user-1")).toEqual({
      assignments: { some: { userId: "user-1" } },
    })
  })

  it("limits managers to decks they created or decks assigned to their teams", () => {
    expect(deckReadWhereForRole("MANAGER", "manager-1")).toEqual({
      OR: [
        { createdById: "manager-1" },
        { assignments: { some: { userId: "manager-1" } } },
        { assignments: { some: { team: { members: { some: { userId: "manager-1" } } } } } },
      ],
    })
  })

  it("does not add a deck-scope filter for customer admins", () => {
    expect(deckReadWhereForRole("ADMIN", "admin-1")).toEqual({})
  })
})
