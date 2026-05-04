import { expect, type Page, test } from "@playwright/test"

type RoleKey = "superAdmin" | "customerAdmin" | "manager" | "agent"

type RoleFlow = {
  label: string
  email: string
  password: string
  landingPath: string
  allowedNav: string[]
  hiddenNav: string[]
  blockedRoutes: string[]
  smoke: (page: Page) => Promise<void>
}

function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback
}

const flows: Record<RoleKey, RoleFlow> = {
  superAdmin: {
    label: "super admin",
    email: env("E2E_SUPER_ADMIN_EMAIL", "admin@recallai.app"),
    password: env("E2E_SUPER_ADMIN_PASSWORD", "admin"),
    landingPath: "/admin",
    allowedNav: ["Platform Admin", "Settings"],
    hiddenNav: ["Dashboard", "Study", "Decks", "Team", "Organisation", "Stats"],
    blockedRoutes: ["/dashboard", "/review", "/decks", "/team", "/org", "/stats"],
    smoke: async (page) => {
      await expect(page.getByText("Manage organisations and users across the platform")).toBeVisible()
      await expect(page.getByRole("button", { name: /new organisation/i })).toBeVisible()
    },
  },
  customerAdmin: {
    label: "customer admin",
    email: env("E2E_CUSTOMER_ADMIN_EMAIL", "customer-admin@test.com"),
    password: env("E2E_CUSTOMER_ADMIN_PASSWORD", "password123"),
    landingPath: "/dashboard",
    allowedNav: ["Dashboard", "Team", "Organisation", "Stats", "Settings"],
    hiddenNav: ["Study", "Decks", "Platform Admin"],
    blockedRoutes: ["/review", "/decks", "/admin"],
    smoke: async (page) => {
      await page.goto("/org")
      await expect(page.getByRole("button", { name: /invite member/i })).toBeVisible()
      await page.getByRole("button", { name: /invite member/i }).click()
      await expect(page.getByRole("heading", { name: /invite team member/i })).toBeVisible()
      await expect(page.getByLabel("Role")).toContainText("Manager")
    },
  },
  manager: {
    label: "manager",
    email: env("E2E_MANAGER_EMAIL", "customer-manager@test.com"),
    password: env("E2E_MANAGER_PASSWORD", "password123"),
    landingPath: "/dashboard",
    allowedNav: ["Dashboard", "Study", "Decks", "Team", "Stats", "Settings"],
    hiddenNav: ["Organisation", "Platform Admin"],
    blockedRoutes: ["/org", "/admin"],
    smoke: async (page) => {
      await page.goto("/decks")
      await expect(page.getByRole("heading", { name: "Decks" })).toBeVisible()
      await expect(page.getByRole("button", { name: /create deck/i })).toBeVisible()
      await page.goto("/team/settings")
      await expect(page.getByRole("heading", { name: /team settings/i })).toBeVisible()
      await expect(page.getByRole("button", { name: /invite member/i })).toBeVisible()
    },
  },
  agent: {
    label: "agent",
    email: env("E2E_AGENT_EMAIL", "customer-agent@test.com"),
    password: env("E2E_AGENT_PASSWORD", "password123"),
    landingPath: "/dashboard",
    allowedNav: ["Dashboard", "Study", "Settings"],
    hiddenNav: ["Decks", "Team", "Organisation", "Stats", "Platform Admin"],
    blockedRoutes: ["/decks", "/team", "/org", "/stats", "/admin"],
    smoke: async (page) => {
      await page.goto("/review")
      await expect(page.getByText("Study")).toBeVisible()
      const startButton = page.getByRole("button", { name: /start review/i })
      await expect(startButton).toBeVisible()
      await startButton.click()
      const answerBox = page.getByLabel("Your answer")
      await expect(answerBox).toBeVisible()
      await answerBox.fill("I would follow the documented SOP and escalate when required.")
      await page.getByRole("button", { name: /reveal answer/i }).click()
      await expect(page.getByText("Answer match")).toBeVisible()
      await expect(page.getByRole("button", { name: /good/i })).toBeVisible()
    },
  },
}

async function loginAs(page: Page, flow: RoleFlow) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(flow.email)
  await page.getByLabel("Password").fill(flow.password)
  await page.getByRole("button", { name: /^sign in$/i }).click()
  await expect(page).toHaveURL(new RegExp(`${flow.landingPath}(?:$|[?#])`))
}

async function expectDesktopNav(page: Page, flow: RoleFlow) {
  const sidebar = page.locator("aside")
  await expect(sidebar).toBeVisible()

  for (const label of flow.allowedNav) {
    await expect(sidebar.getByRole("link", { name: label })).toBeVisible()
  }
  for (const label of flow.hiddenNav) {
    await expect(sidebar.getByRole("link", { name: label })).toHaveCount(0)
  }
}

async function expectBlockedRoutesRedirect(page: Page, flow: RoleFlow) {
  for (const route of flow.blockedRoutes) {
    await page.goto(route)
    await expect(page).toHaveURL(new RegExp(`${flow.landingPath}(?:$|[?#])`))
  }
}

for (const flow of Object.values(flows)) {
  test.describe(`${flow.label} E2E flow`, () => {
    test("can sign in, sees correct navigation, and is blocked from forbidden routes", async ({ page }) => {
      await loginAs(page, flow)
      await expectDesktopNav(page, flow)
      await expectBlockedRoutesRedirect(page, flow)
    })

    test("can perform the role-specific smoke workflow", async ({ page }) => {
      await loginAs(page, flow)
      await flow.smoke(page)
    })
  })
}
