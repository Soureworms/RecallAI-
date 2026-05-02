# RecallAI

AI-powered spaced repetition for CX teams. Upload your knowledge base, let OpenAI generate flashcards, and keep your entire team sharp with science-backed review scheduling.

## Features

- **FSRS scheduling** — ts-fsrs algorithm adapts to each agent's memory
- **AI card generation** — upload PDFs or DOCX files; OpenAI writes the flashcards
- **Team analytics** — retention heatmaps, knowledge gaps, new-hire ramp tracking
- **Role-based access** — ADMIN / MANAGER / AGENT with enforced permissions
- **Invite system** — share a link to onboard new team members

---

## Product Logic Docs

- [Customer organization, team, and SOP access flow](docs/customer-org-team-sop-flow.md)

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+ (or Docker)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, OPENAI_API_KEY

# 3. Run database migrations
pnpm db:migrate

# 4. (Optional) Seed sample data
pnpm db:seed

# 5. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker (full stack)

```bash
# From apps/web/
OPENAI_API_KEY=sk-ant-... docker compose up
```

The app and a fresh PostgreSQL database start together. Migrations run automatically.

---

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Next.js in development mode |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm test` | Run the Vitest test suite |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm db:migrate` | Apply Prisma migrations (dev) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed the database with sample data |

---

## Architecture

```
apps/web/
├── app/
│   ├── (auth)/          # Sign-in, register, invite accept pages
│   ├── (dashboard)/     # Protected app pages
│   │   ├── dashboard/   # Overview + streak stats
│   │   ├── review/      # FSRS review session
│   │   ├── decks/       # Deck + card management
│   │   ├── stats/       # Personal analytics
│   │   └── team/        # Team management + analytics
│   └── api/             # Route handlers
│       ├── auth/        # NextAuth + register + invite
│       ├── cards/       # Card CRUD
│       ├── decks/       # Deck CRUD + AI generation
│       ├── documents/   # File upload + text extraction
│       ├── review/      # FSRS scheduling endpoints
│       ├── analytics/   # User + team analytics
│       ├── teams/       # Team CRUD + members
│       └── health/      # Health check
├── components/
│   ├── dashboard/       # Sidebar, bottom tab bar
│   └── ui/              # Shared UI (Modal, etc.)
├── hooks/               # usePermissions()
├── lib/
│   ├── auth/            # requireRole(), permission helpers
│   ├── services/        # analytics.ts, card-generator.ts, scheduler.ts
│   ├── rate-limit.ts    # In-memory rate limiter
│   └── db.ts            # Prisma client singleton
└── prisma/
    ├── schema.prisma
    └── migrations/
```

### Key Technology Choices

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | Server components + route handlers in one repo |
| Database | PostgreSQL + Prisma | Type-safe queries, easy migrations |
| Auth | NextAuth v5 (beta) | JWT sessions, Credentials provider |
| Scheduling | ts-fsrs | Production-grade FSRS implementation |
| AI | OpenAI OpenAI | Best-in-class instruction following for card generation |
| Charts | Recharts | Lightweight, composable |
| Styling | Tailwind CSS | Utility-first, mobile-first |

---

## Deployment

See [deploy-checklist.md](./deploy-checklist.md) for:
- Required environment variables
- Production database migration steps
- First-time admin user creation
- Recommended hosting providers (Vercel, Railway, Fly.io)
- Monitoring recommendations
