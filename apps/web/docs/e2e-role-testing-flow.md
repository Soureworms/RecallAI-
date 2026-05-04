# E2E Role Testing Flow

This Playwright suite verifies that each RecallAI user class can enter the correct workspace, sees only the expected navigation, is redirected away from forbidden routes, and can complete one role-specific smoke workflow.

## Test Users

The suite defaults to the seeded local users:

| Role | Email | Password | Expected landing |
|---|---|---|---|
| Super admin | `admin@recallai.app` | `admin` | `/admin` |
| Customer admin | `customer-admin@test.com` | `password123` | `/dashboard` |
| Manager | `customer-manager@test.com` | `password123` | `/dashboard` |
| Agent | `customer-agent@test.com` | `password123` | `/dashboard` |

Use environment variables to target production/staging accounts without editing tests:

| Variable | Purpose |
|---|---|
| `E2E_BASE_URL` | App URL, for example `https://www.recallai.co.za` |
| `E2E_SKIP_WEB_SERVER=1` | Do not start local `pnpm dev`; use the existing `E2E_BASE_URL` |
| `E2E_SUPER_ADMIN_EMAIL`, `E2E_SUPER_ADMIN_PASSWORD` | Super admin override |
| `E2E_CUSTOMER_ADMIN_EMAIL`, `E2E_CUSTOMER_ADMIN_PASSWORD` | Customer admin override |
| `E2E_MANAGER_EMAIL`, `E2E_MANAGER_PASSWORD` | Manager override |
| `E2E_AGENT_EMAIL`, `E2E_AGENT_PASSWORD` | Agent override |

## Covered Flows

| Role | Navigation allowed | Forbidden direct routes | Smoke workflow |
|---|---|---|---|
| Super admin | Platform Admin, Settings | Dashboard, Study, Decks, Team, Organisation, Stats | Opens platform admin and sees organisation/user controls |
| Customer admin | Dashboard, Team, Organisation, Stats, Settings | Study, Decks, Platform Admin | Opens Organisation, opens Invite Member, verifies Manager role assignment is available |
| Manager | Dashboard, Study, Decks, Team, Stats, Settings | Organisation, Platform Admin | Opens Decks and Team Settings, verifies content/team controls are available |
| Agent | Dashboard, Study, Settings | Decks, Team, Organisation, Stats, Platform Admin | Starts Study, types an answer, reveals expected answer, verifies answer-match evidence |

## Running Locally

From `apps/web`, make sure the database is migrated and seeded:

```powershell
corepack pnpm db:deploy
corepack pnpm db:seed
corepack pnpm test:e2e
```

The Playwright config starts `pnpm dev` automatically for local URLs.

## Running Against Production Or Staging

```powershell
$env:E2E_BASE_URL = "https://www.recallai.co.za"
$env:E2E_SKIP_WEB_SERVER = "1"
corepack pnpm --dir apps/web test:e2e
```

For production, use dedicated disposable E2E users so the agent study smoke test can safely reveal a card without affecting a real employee's compliance history.
