import { describe, expect, it } from "vitest"

import { scoreTypedAnswer } from "../answer-scorer"

describe("scoreTypedAnswer", () => {
  it("passes an exact short answer", () => {
    const result = scoreTypedAnswer("30 days", "30 days")

    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)
  })

  it("passes a close procedural paraphrase", () => {
    const result = scoreTypedAnswer(
      "Manager approval is needed before refunds above 500 rand.",
      "Manager approval is required before confirming a refund request over 500 rand."
    )

    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.passed).toBe(true)
    expect(result.matchedKeywords).toContain("manager")
    expect(result.matchedKeywords).toContain("500")
  })

  it("penalizes missing required numbers", () => {
    const result = scoreTypedAnswer(
      "Manager approval is needed before high value refunds.",
      "Manager approval is required before confirming a refund request over 500 rand."
    )

    expect(result.score).toBeLessThan(70)
    expect(result.passed).toBe(false)
    expect(result.missingKeywords).toContain("500")
  })

  it("fails an empty attempt", () => {
    const result = scoreTypedAnswer("", "Verify identity before discussing account details.")

    expect(result.score).toBe(0)
    expect(result.passed).toBe(false)
  })
})
