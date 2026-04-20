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
      preview: {
        again: { nextDue: new Date().toISOString(), scheduledDays: 0 },
        hard: { nextDue: new Date().toISOString(), scheduledDays: 1 },
        good: { nextDue: new Date().toISOString(), scheduledDays: 3 },
        easy: { nextDue: new Date().toISOString(), scheduledDays: 7 },
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
    if (url === "/api/review" && mockFetch.mock.calls.length > 0) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

// Dynamically import the page component (avoids module-level side effects)
async function renderReviewPage() {
  const { default: ReviewPage } = await import("../page")
  return render(<ReviewPage />)
}

describe("Review session", () => {
  it("shows 'All caught up' message when due count is 0", async () => {
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
      expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
    })
  })

  it("shows due card count and Start Review button when cards are due", async () => {
    await renderReviewPage()
    await waitFor(() => {
      expect(screen.getByText(/1 card due/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /start review/i })).toBeInTheDocument()
    })
  })

  it("renders question and 'Show answer' button after starting session", async () => {
    await renderReviewPage()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /start review/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /start review/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/what is the refund window/i).length).toBeGreaterThan(0)
      expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument()
    })
  })

  it("reveals answer and rating buttons after clicking Show answer", async () => {
    await renderReviewPage()

    await waitFor(() => screen.getByRole("button", { name: /start review/i }))
    fireEvent.click(screen.getByRole("button", { name: /start review/i }))

    await waitFor(() => screen.getByRole("button", { name: /show answer/i }))
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }))

    await waitFor(() => {
      expect(screen.getByText("30 days")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /again/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /easy/i })).toBeInTheDocument()
    })
  })
})
