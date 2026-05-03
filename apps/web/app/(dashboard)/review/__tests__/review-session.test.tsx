/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import React from "react"

// ── Mock next-auth ────────────────────────────────────────────────────────────
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u-1", role: "AGENT" } } }),
}))

// ── Mock next/navigation ──────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

// ── Fetch mock ────────────────────────────────────────────────────────────────
const mockFetch = vi.fn()
global.fetch = mockFetch

const MOCK_STATS = { dueCount: 1, todayCount: 0, streak: 3, nextDueDate: null }
const MOCK_DUE_CARDS = {
  dueCards: [
    {
      userCardId: "uc-1",
      cardId: "c-1",
      question: "What is the refund window?",
      answer: "30 days",
      format: "QA",
      deckName: "Policies",
      tags: [],
      preview: {
        again: { nextDue: new Date().toISOString(), scheduledDays: 0 },
        hard:  { nextDue: new Date().toISOString(), scheduledDays: 1 },
        good:  { nextDue: new Date().toISOString(), scheduledDays: 3 },
        easy:  { nextDue: new Date().toISOString(), scheduledDays: 7 },
      },
    },
  ],
  nextDueDate: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/review/stats") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_STATS) })
    }
    if (url === "/api/review/due") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_DUE_CARDS) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

async function renderReviewPage() {
  const { default: ReviewPage } = await import("../page")
  return render(<ReviewPage />)
}

describe("Review session", () => {
  it("shows caught-up message when due count is 0", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/review/stats") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...MOCK_STATS, dueCount: 0, nextDueDate: null }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    await renderReviewPage()
    await waitFor(() => {
      // Design system copy: "You're caught up."
      expect(screen.getByText(/you.re caught up/i)).toBeInTheDocument()
    })
  })

  it("shows due card count and start review button when cards are due", async () => {
    await renderReviewPage()
    await waitFor(() => {
      expect(screen.getByText(/1 card due/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /start review/i })).toBeInTheDocument()
    })
  })

  it("renders question after starting session", async () => {
    await renderReviewPage()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /start review/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /start review/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/what is the refund window/i).length).toBeGreaterThan(0)
    })
  })

  it("requires a typed answer before reveal and rating", async () => {
    await renderReviewPage()

    await waitFor(() => screen.getByRole("button", { name: /start review/i }))
    fireEvent.click(screen.getByRole("button", { name: /start review/i }))

    // Wait for card to render
    await waitFor(() =>
      expect(screen.getAllByText(/what is the refund window/i).length).toBeGreaterThan(0)
    )

    // Space should not reveal while the typed answer is empty.
    fireEvent.keyDown(window, { code: "Space", key: " " })
    expect(screen.queryByText("30 days")).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: "30 days" } })
    fireEvent.click(screen.getByRole("button", { name: /reveal answer/i }))

    await waitFor(() => {
      expect(screen.getAllByText("30 days").length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/answer match/i)).toBeInTheDocument()
      // Rating buttons are always rendered; after flip they become active
      expect(screen.getByRole("button", { name: /again/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /easy/i })).toBeInTheDocument()
    })
  })
})
