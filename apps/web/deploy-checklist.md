# RecallAI Deployment Checklist

## Required Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string — `postgresql://user:pass@host:5432/db` | Yes |
| `NEXTAUTH_SECRET` | Random secret for session signing — generate with `openssl rand -base64 32` | Yes |
| `NEXTAUTH_URL` | Full public URL of your deployment — e.g. `https://recallai.example.com` | Yes |
| `OPENAI_API_KEY` | API key from console.openai.com — needed for AI card generation | Yes |

---

## Database Migration (Production)

Run this **once** before (or during) first deployment, and after every schema change:

```bash
npx prisma migrate deploy
```

With Docker Compose this runs automatically on container startup. For other platforms:

```bash
# Vercel: add to your build command
npx prisma generate && npx prisma migrate deploy && next build

# Railway / Fly.io: run as a one-off command before deploying
railway run npx prisma migrate deploy
fly ssh console -C "npx prisma migrate deploy"
```

---

## First-Time Setup: Creating the Initial Admin User

After the database is migrated, create the first admin user via the registration page
(`/register`) or directly in the database:

```bash
# Using psql / any SQL client
INSERT INTO "User" (id, name, email, "hashedPassword", role, "orgId", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Admin Name',
  'admin@example.com',
  -- bcrypt hash of your chosen password (cost 12)
  '$2b$12$...',
  'ADMIN',
  (SELECT id FROM "Organization" LIMIT 1),
  now(),
  now()
);
```

Alternatively, register normally and then promote the user:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

---

## Recommended Hosting

### Vercel (Easiest)
- Connects directly to your GitHub repo
- Set env vars in the Vercel dashboard
- Use **Neon**, **Supabase**, or **Railway** for the PostgreSQL database
- No Dockerfile needed — Vercel builds Next.js natively

### Railway
- Supports both the Next.js app and PostgreSQL in one project
- Add a PostgreSQL plugin; the `DATABASE_URL` is injected automatically
- Deploy from GitHub or Docker image

### Fly.io
- Best for the Docker Compose setup
- Run `fly launch` from `apps/web/`, then `fly secrets set NEXTAUTH_SECRET=...`
- Use `fly postgres create` for the database

---

## Monitoring Recommendations

- **Health check endpoint**: `GET /api/health` — returns `{ status, version, database }`
  - Configure your hosting provider's health check to hit this endpoint
  - Returns `200 ok` when healthy, `503 degraded` if DB is unreachable

- **Uptime**: UptimeRobot or Better Uptime — free tier is sufficient for most teams

- **Error tracking**: Sentry — add `@sentry/nextjs` and set `SENTRY_DSN`

- **Logging**: Railway and Fly.io expose stdout logs out of the box.
  For Vercel, use the Vercel Log Drains integration.

- **Database backups**: Enable automated backups on your database provider
  (Neon, Supabase, and Railway all offer daily backups on paid plans)
