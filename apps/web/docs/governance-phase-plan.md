# RecallAI Governance Implementation Plan

> Living plan for role governance, typed-answer compliance, team-scoped content, analytics, and future audit controls. Update this document at the end of every phase before committing.

## Operating Rules

- Each phase must be independently deployable before it is pushed to `main`.
- Use TDD for behavior changes: write the failing test, verify it fails, implement, then verify green.
- Keep migrations additive unless a dedicated data migration/backfill phase has been planned.
- Commit and push after each production-safe phase.
- Record the commit hash, verification commands, and any known gaps in this document.

## Target Role Model

- Super admin creates organizations and invites customer admins from the platform admin portal.
- Customer admins govern the organization, teams, and role assignment, but do not study or manage SOP card content day to day.
- Managers upload team SOPs, generate/review cards, assign decks to their teams, study/test content, and view team/member stats.
- Agents only use Dashboard, Study, and Settings. They cannot browse decks or stats directly.

## Phase 1: Role Matrix And Access Cleanup

**Status:** Done and pushed.

**Commit:** `f9fc34b` - `Enforce role capability access`

**Goal:** Centralize navigation and route capability decisions so the UI and direct URL access reflect the target role model.

**Built:**
- Added `lib/auth/capabilities.ts` as the shared role capability matrix.
- Updated dashboard sidebar navigation to derive menu items from the shared matrix.
- Updated middleware route guards to use the shared matrix.
- Restricted deck/content management API mutations to managers for the fast governance pass.
- Kept agent assigned-deck API reads available where existing dashboard/study flows depend on them.

**Verification:**
- `corepack pnpm --dir apps/web exec vitest run lib/auth/__tests__/capabilities.test.ts app/api/__tests__/permissions.test.ts app/api/__tests__/team-sop-access.test.ts app/api/__tests__/production-e2e-regressions.test.ts app/api/__tests__/generate-route-fallback.test.ts`
- `corepack pnpm --filter web build`

**Known Gaps:**
- Analytics still need a clearer manager/customer-admin split.
- Customer-admin role assignment UX still needs a dedicated governance pass.

## Phase 2: Typed Answer Compliance And Review Evidence

**Status:** Implemented locally; ready to commit and push after final git checks.

**Goal:** Prevent spacebar-only completion by requiring a typed answer before reveal, store answer evidence on each review, and surface a basic answer-match score.

**Current Scope:**
- Add a deterministic, non-LLM answer scorer for fast compliance benchmarking.
- Require `typedAnswer` in `POST /api/review`.
- Store `typedAnswer`, `answerScore`, and `answerPassed` on `ReviewLog`.
- Update Study UI so users type an answer, reveal, compare against expected answer, then self-rate with FSRS.
- Add basic stats surfacing for answer-score averages/pass rate.

**Files:**
- Create: `apps/web/lib/study/answer-scorer.ts`
- Create: `apps/web/lib/study/__tests__/answer-scorer.test.ts`
- Create: `apps/web/app/api/__tests__/review-submit-route.test.ts`
- Create: `apps/web/lib/services/__tests__/scheduler-submit-review.test.ts`
- Modify: `apps/web/app/(dashboard)/review/page.tsx`
- Modify: `apps/web/app/(dashboard)/review/__tests__/review-session.test.tsx`
- Modify: `apps/web/app/api/review/route.ts`
- Modify: `apps/web/app/api/review/stats/route.ts`
- Modify: `apps/web/lib/schemas/api.ts`
- Modify: `apps/web/lib/services/scheduler.ts`
- Modify: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/20260503121000_add_review_answer_evidence/migration.sql`

**Verification To Run Before Commit:**
- Done: `corepack pnpm --dir apps/web exec vitest run lib/study/__tests__/answer-scorer.test.ts app/api/__tests__/review-submit-route.test.ts lib/services/__tests__/scheduler-submit-review.test.ts`
  - Result: 3 files passed, 7 tests passed.
- Done: `corepack pnpm --dir apps/web exec vitest run --testNamePattern "Review session"`
  - Result: 1 file passed, 4 review-session tests passed.
- Done: `corepack pnpm --dir apps/web exec vitest run lib/study/__tests__/answer-scorer.test.ts app/api/__tests__/review-submit-route.test.ts lib/services/__tests__/scheduler-submit-review.test.ts lib/auth/__tests__/capabilities.test.ts app/api/__tests__/permissions.test.ts app/api/__tests__/team-sop-access.test.ts app/api/__tests__/production-e2e-regressions.test.ts app/api/__tests__/generate-route-fallback.test.ts app/api/__tests__/review-due-route.test.ts app/api/__tests__/review-due-assignments.test.ts`
  - Result: 10 files passed, 46 tests passed.
- Done: `corepack pnpm --filter web build`
  - Result: exit 0. Known Next dynamic-route warnings still appear during static collection, but routes are emitted as dynamic.
- Attempted: `corepack pnpm --dir apps/web exec vitest run`
  - Result: local Node heap OOM after 15/16 files and 81/91 tests. Treat as inconclusive, not a product test failure.

**Known Risks To Watch:**
- Prisma Client generation must include the new nullable `ReviewLog` fields before type-checking passes.
- PowerShell needs quoted or escaped paths for `app/(dashboard)/...` tests.
- The deterministic scorer is a benchmark, not semantic proof. It is intentionally cheap for now; an LLM grading option can be added later for high-risk decks.

## Phase 3: Manager And Customer Admin Analytics Split

**Status:** Planned.

**Goal:** Give managers team/member analytics and customer admins organization-level governance analytics without exposing agent-only or manager-only surfaces.

**Planned Scope:**
- Managers see team stats, per-user stats, deck weakness, answer-match score, FSRS retention, and completion.
- Customer admins see org-level rollups, teams, role assignment, and compliance summaries.
- Agents do not see Stats or Decks routes.
- Tighten API authorization for analytics endpoints to match the route model.

**Likely Files:**
- `apps/web/app/(dashboard)/stats/page.tsx`
- `apps/web/app/api/analytics/org/route.ts`
- `apps/web/app/api/analytics/team/[teamId]/route.ts`
- `apps/web/app/api/analytics/user/[userId]/route.ts`
- `apps/web/lib/services/analytics.ts`
- `apps/web/lib/auth/capabilities.ts`

## Phase 4: Role Assignment And Team Governance UX

**Status:** Planned.

**Goal:** Make customer admins responsible for team creation and role assignment while managers operate inside their assigned teams.

**Planned Scope:**
- Add or clarify a role/team assignment menu item for customer admins.
- Ensure customer admins can create teams and assign managers/agents.
- Ensure managers only manage teams they belong to or are assigned to manage.
- Audit invite flows so managers cannot invite customer admins or super admins.

## Phase 5: Team-Scoped SOP Assignment Hardening

**Status:** Planned.

**Goal:** Ensure uploaded SOPs, generated cards, decks, assignments, and analytics are team-scoped from database query to UI.

**Planned Scope:**
- Managers assign decks/documents to specific teams.
- Support team cannot see success team SOPs/cards unless assigned.
- Add regression tests for cross-team read/write attempts.
- Review all `deckId`, `documentId`, and `teamId` API paths for org and team scope.

## Phase 6: Compliance Audit Trail And Policy Controls

**Status:** Planned.

**Goal:** Build compliance-grade auditability on top of the typed-answer and FSRS events.

**Planned Scope:**
- Add audit reports for review evidence, answer score, self-rating, due/completion status, and manager interventions.
- Add configurable thresholds for answer-match score and deck completion.
- Consider LLM grading as an optional high-cost/high-confidence mode for regulated decks.
- Add exportable compliance evidence for managers/customer admins.

## Decision Log

- 2026-05-03: Chose deterministic word/numeric matching for Phase 2 to avoid per-review LLM cost and latency.
- 2026-05-03: Kept FSRS self-rating because it remains useful for scheduling, but paired it with typed-answer evidence for compliance benchmarking.
- 2026-05-03: Restricted Phase 1 content management to managers while leaving deeper customer-admin governance for later phases.
