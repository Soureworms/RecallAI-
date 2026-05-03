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

**Status:** Done and pushed.

**Commit:** `f36e88c` - `Require typed answer review evidence`

**Goal:** Prevent spacebar-only completion by requiring a typed answer before reveal, store answer evidence on each review, and surface a basic answer-match score.

**Built:**
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

**Verification:**
- `corepack pnpm --dir apps/web exec vitest run lib/study/__tests__/answer-scorer.test.ts app/api/__tests__/review-submit-route.test.ts lib/services/__tests__/scheduler-submit-review.test.ts`
  - Result: 3 files passed, 7 tests passed.
- `corepack pnpm --dir apps/web exec vitest run --testNamePattern "Review session"`
  - Result: 1 file passed, 4 review-session tests passed.
- `corepack pnpm --dir apps/web exec vitest run lib/study/__tests__/answer-scorer.test.ts app/api/__tests__/review-submit-route.test.ts lib/services/__tests__/scheduler-submit-review.test.ts lib/auth/__tests__/capabilities.test.ts app/api/__tests__/permissions.test.ts app/api/__tests__/team-sop-access.test.ts app/api/__tests__/production-e2e-regressions.test.ts app/api/__tests__/generate-route-fallback.test.ts app/api/__tests__/review-due-route.test.ts app/api/__tests__/review-due-assignments.test.ts`
  - Result: 10 files passed, 46 tests passed.
- `corepack pnpm --filter web build`
  - Result: exit 0. Known Next dynamic-route warnings still appear during static collection, but routes are emitted as dynamic.
- `corepack pnpm --dir apps/web exec vitest run`
  - Result: local Node heap OOM after 15/16 files and 81/91 tests. Treat as inconclusive, not a product test failure.

**Known Risks To Watch:**
- Prisma Client generation must include the new nullable `ReviewLog` fields before type-checking passes.
- PowerShell needs quoted or escaped paths for `app/(dashboard)/...` tests.
- The deterministic scorer is a benchmark, not semantic proof. It is intentionally cheap for now; an LLM grading option can be added later for high-risk decks.

## Phase 3: Manager And Customer Admin Analytics Split

**Status:** Done and pushed.

**Commit:** `f6605c9` - `Surface role-specific analytics`

**Goal:** Give managers team/member analytics and customer admins organization-level governance analytics without exposing agent-only or manager-only surfaces.

**Built:**
- Added a role-aware stats section helper so the Stats page can present manager and customer-admin views separately.
- Changed customer admins to see organization and document analytics without a personal study panel.
- Changed managers to see a Team Stats landing surface with document analytics, personal learning stats, and a direct link to team/member analytics.
- Added answer-match average and pass-rate fields to user retention scores.
- Added typed-answer evidence fields to recent review analytics.
- Fixed team analytics UI mappings so retention, knowledge-gap, and member tables align with the analytics service response shapes.
- Added answer-match evidence to manager team/member tables and recent review analytics.
- Kept agents out of Stats and Decks through Phase 1 capability enforcement.

**Files:**
- Create: `apps/web/lib/analytics/stats-sections.ts`
- Create: `apps/web/lib/analytics/__tests__/stats-sections.test.ts`
- `apps/web/app/(dashboard)/stats/page.tsx`
- `apps/web/app/(dashboard)/team/page.tsx`
- `apps/web/components/analytics/user-analytics.tsx`
- `apps/web/lib/services/analytics.ts`
- `apps/web/lib/services/__tests__/analytics.test.ts`

**Verification Recorded Before Commit:**
- `corepack pnpm --dir apps/web exec vitest run lib/analytics/__tests__/stats-sections.test.ts lib/services/__tests__/analytics.test.ts`
  - Result: 2 files passed, 15 tests passed.
- `corepack pnpm --dir apps/web exec vitest run`
  - Result: 17 files passed, 96 tests passed.
- `corepack pnpm --filter web build`
  - Result: exit 0 after refreshing dependencies with `corepack pnpm install --force`. Known Next dynamic-route warnings still appear during static collection, but routes are emitted as dynamic.

**Known Gaps:**
- This phase surfaces manager/customer-admin analytics differences but does not yet create the dedicated customer-admin role-assignment workspace.
- Analytics API authorization still deserves a deeper endpoint-by-endpoint hardening pass in Phase 5.

## Phase 4: Role Assignment And Team Governance UX

**Status:** Done and pushed.

**Commit:** `6e82f67` - `Tighten team role governance`

**Goal:** Make customer admins responsible for team creation and role assignment while managers operate inside their assigned teams.

**Built:**
- Added a shared `canInviteTeamRole` capability helper for team invite role assignment.
- Customer admins can invite agents or managers to teams.
- Managers can invite agents only, and cannot invite managers or elevated roles.
- Managers and agents only receive teams where they are members from `GET /api/teams`; customer admins still see all org teams.
- Team invite listing now uses the same team-access check as team analytics, so managers cannot inspect invites for teams they do not belong to.
- Team Settings hides the Manager invite option unless the current user is a customer admin.

**Files:**
- `apps/web/lib/auth/capabilities.ts`
- `apps/web/lib/auth/__tests__/capabilities.test.ts`
- `apps/web/app/api/teams/route.ts`
- `apps/web/app/api/teams/[teamId]/invite/route.ts`
- `apps/web/app/api/__tests__/permissions.test.ts`
- `apps/web/app/(dashboard)/team/settings/page.tsx`

**Verification Recorded Before Commit:**
- `corepack pnpm --dir apps/web exec vitest run lib/auth/__tests__/capabilities.test.ts app/api/__tests__/permissions.test.ts`
  - Red result before implementation: 2 files failed, 4 expected failures.
  - Green result after implementation: 2 files passed, 32 tests passed.
- `corepack pnpm --dir apps/web exec vitest run`
  - Result: 17 files passed, 102 tests passed.
- `corepack pnpm --filter web build`
  - Result: exit 0 after refreshing dependencies with `corepack pnpm install --force`. Known Next dynamic-route warnings still appear during static collection, but routes are emitted as dynamic.

**Known Gaps:**
- This phase tightens role assignment permissions but does not redesign the customer-admin governance UX into a dedicated Teams/Roles page.
- Team rename/member-removal policy remains permissive for managers inside their own teams and should be revisited with the team-scoped SOP hardening pass.

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
- 2026-05-03: Phase 3 keeps detailed team/member stats in the Team workspace and makes Stats a role-specific analytics entry point, so managers can drill into team compliance without exposing agent-only routes.
- 2026-05-03: Phase 4 allows managers to invite agents into teams they belong to, but reserves manager-role assignment for customer admins.
