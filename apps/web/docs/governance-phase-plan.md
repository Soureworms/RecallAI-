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

**Status:** Done and pushed.

**Slice 1 Commit:** `70790ac` - `Enforce manager deck team scope`

**Slice 2 Commit:** `1fedb1e` - `Enforce deck document team scope`

**Slice 3 Commit:** `8f301a4` - `Enforce card mutation team scope`

**Slice 4 Commit:** `6ae3944` - `Enforce document upload analytics scope`

**Goal:** Ensure uploaded SOPs, generated cards, decks, assignments, and analytics are team-scoped from database query to UI.

**Built In Slice 1:**
- Added `deckReadWhereForRole` to express role-specific deck read filters.
- Agents still list only directly assigned decks.
- Managers now list only decks they created, decks directly assigned to them, or decks assigned to one of their teams.
- Managers can no longer assign a deck to a team they do not belong to.

**Files In Slice 1:**
- Create: `apps/web/lib/auth/deck-scope.ts`
- Create: `apps/web/lib/auth/__tests__/deck-scope.test.ts`
- `apps/web/app/api/decks/route.ts`
- `apps/web/app/api/decks/[deckId]/assign/route.ts`
- `apps/web/app/api/__tests__/team-sop-access.test.ts`

**Verification Recorded Before Slice 1 Commit:**
- `corepack pnpm --dir apps/web exec vitest run lib/auth/__tests__/deck-scope.test.ts app/api/__tests__/team-sop-access.test.ts`
  - Red result before implementation: missing helper plus 2 expected API failures.
  - Green result after implementation: 2 files passed, 9 tests passed.
- `corepack pnpm --dir apps/web exec vitest run`
  - Result: 18 files passed, 107 tests passed.
- `corepack pnpm --filter web build`
  - Result: exit 0 after refreshing dependencies with `corepack pnpm install --force`. Known Next dynamic-route warnings still appear during static collection, but routes are emitted as dynamic.

**Remaining Scope:**
- No known Phase 5 access-control gaps remain after Slice 4 verification.

**Built In Slice 2:**
- Added shared helpers for deck access checks and manager-scoped direct user targeting.
- Applied team-scope deck access to deck detail reads.
- Applied team-scope deck access to deck card reads and manual card creation.
- Applied deck access to document listing by deck, document reads, and AI generation.
- Blocked generation when a source document belongs to a different deck.
- Blocked manager direct assignment and assignment removal for users outside the manager's teams.

**Files In Slice 2:**
- `apps/web/lib/auth/deck-scope.ts`
- `apps/web/lib/auth/__tests__/deck-scope.test.ts`
- `apps/web/app/api/__tests__/team-sop-access.test.ts`
- `apps/web/app/api/__tests__/generate-route-fallback.test.ts`
- `apps/web/app/api/decks/[deckId]/route.ts`
- `apps/web/app/api/decks/[deckId]/cards/route.ts`
- `apps/web/app/api/decks/[deckId]/assign/route.ts`
- `apps/web/app/api/decks/[deckId]/generate/route.ts`
- `apps/web/app/api/documents/route.ts`
- `apps/web/app/api/documents/[documentId]/route.ts`

**Verification Recorded Before Slice 2 Commit:**
- `corepack pnpm --dir apps/web exec vitest run lib/auth/__tests__/deck-scope.test.ts app/api/__tests__/team-sop-access.test.ts`
  - Red result before implementation: 2 files failed, 9 expected failures.
  - Green result after implementation: 2 files passed, 19 tests passed.
- `corepack pnpm --dir apps/web exec vitest run`
  - Result: 18 files passed, 117 tests passed.
- `corepack pnpm --filter web build`
  - Result: exit 0 after refreshing dependencies with `corepack pnpm install --force`. Known Next dynamic-route warnings still appear during static collection, but routes are emitted as dynamic.

**Built In Slice 3:**
- Applied deck access checks to deck assignment listing.
- Applied deck access checks to deck archive and update paths.
- Applied deck access checks to card update, approval, archive/delete, and bulk approval paths.
- Added regression coverage for manager attempts to mutate decks/cards outside their team scope.

**Files In Slice 3:**
- `apps/web/app/api/__tests__/team-sop-access.test.ts`
- `apps/web/app/api/decks/[deckId]/route.ts`
- `apps/web/app/api/decks/[deckId]/assign/route.ts`
- `apps/web/app/api/decks/[deckId]/cards/[cardId]/route.ts`
- `apps/web/app/api/decks/[deckId]/cards/bulk-approve/route.ts`

**Verification Recorded Before Slice 3 Commit:**
- `corepack pnpm --dir apps/web exec vitest run app/api/__tests__/team-sop-access.test.ts --testNamePattern "outside their team scope"`
  - Red result before implementation: 1 file failed, 6 expected mutation failures.
  - Green result after implementation: 1 file passed, 12 matching tests passed.
- `corepack pnpm --dir apps/web exec vitest run lib/auth/__tests__/deck-scope.test.ts app/api/__tests__/team-sop-access.test.ts`
  - Result: 2 files passed, 25 tests passed.
- `corepack pnpm --dir apps/web exec vitest run`
  - Result: 18 files passed, 123 tests passed.
- `corepack pnpm --filter web build`
  - Result: exit 0 after refreshing dependencies with `corepack pnpm install --force`. Known Next dynamic-route warnings still appear during static collection, but routes are emitted as dynamic.

**Built In Slice 4:**
- Restricted document upload-by-deck to decks accessible by the uploader's role and team scope.
- Scoped manager document analytics to documents they uploaded without a deck or documents attached to decks they can reach.
- Added regression coverage for manager attempts to upload into inaccessible decks and view user analytics outside shared teams.

**Files In Slice 4:**
- `apps/web/app/api/__tests__/team-sop-access.test.ts`
- `apps/web/app/api/__tests__/permissions.test.ts`
- `apps/web/app/api/documents/upload/route.ts`
- `apps/web/app/api/analytics/documents/route.ts`
- `apps/web/lib/services/analytics.ts`
- `apps/web/lib/services/__tests__/analytics.test.ts`

**Verification Recorded Before Slice 4 Commit:**
- `corepack pnpm --dir apps/web exec vitest run app/api/__tests__/team-sop-access.test.ts --testNamePattern "upload a document"`
  - Red result before implementation: 1 file failed; upload returned 201 for an inaccessible deck.
  - Green result after implementation: 1 file passed, 1 matching test passed.
- `corepack pnpm --dir apps/web exec vitest run lib/services/__tests__/analytics.test.ts --testNamePattern "DocumentPerformance"`
  - Red result before implementation: 1 file failed; manager document analytics query was org-wide.
  - Green result after implementation: 1 file passed, 1 matching test passed.
- `corepack pnpm --dir apps/web exec vitest run app/api/__tests__/team-sop-access.test.ts lib/services/__tests__/analytics.test.ts app/api/__tests__/permissions.test.ts`
  - Result: 3 files passed, 60 tests passed.
- `corepack pnpm --dir apps/web exec vitest run`
  - Result: 18 files passed, 126 tests passed.
- `corepack pnpm --filter web build`
  - Initial result: failed because the local Next build worker file was missing.
  - Recovery: refreshed dependencies with `corepack pnpm install --force`.
  - Final result: exit 0. Known Next dynamic-route warnings still appear during static collection, but routes are emitted as dynamic.

## Phase 6: Compliance Audit Trail And Policy Controls

**Status:** In progress. Slices 1 and 2 done and pushed. Slice 3 implemented locally; full verification, commit, and push pending.

**Goal:** Build compliance-grade auditability on top of the typed-answer and FSRS events.

**Slice 1 Commit:** `3ac8c4d` - `Add compliance review evidence API`

**Slice 2 Commit:** `ea3164d` - `Add compliance evidence CSV export`

**Planned Scope:**
- Add audit reports for review evidence, answer score, self-rating, due/completion status, and manager interventions.
- Add configurable thresholds for answer-match score and deck completion.
- Consider LLM grading as an optional high-cost/high-confidence mode for regulated decks.
- Add exportable compliance evidence for managers/customer admins.

**Built In Slice 1 Locally:**
- Added `GET /api/compliance/reviews` as the first typed-answer evidence audit report.
- Returns review evidence with typed answer, answer score, answer pass/fail, rating, user, card, and deck context.
- Supports basic filters for deck, team, user, pass/fail status, and result limit.
- Enforces manager/admin access, manager team access, manager shared-user access, and manager deck reachability.

**Files In Slice 1 Locally:**
- Create: `apps/web/app/api/compliance/reviews/route.ts`
- Create: `apps/web/app/api/__tests__/compliance-reviews.test.ts`

**Verification Recorded For Local Slice 1:**
- `corepack pnpm --dir apps/web exec vitest run app/api/__tests__/compliance-reviews.test.ts`
  - Red result before implementation: 1 file failed; route module did not exist.
  - Green result after implementation: 1 file passed, 3 tests passed.
- `corepack pnpm --dir apps/web exec vitest run`
  - Result: 19 files passed, 129 tests passed.
- `corepack pnpm --filter web build`
  - Initial result: failed because the local Next build worker file was missing.
  - Recovery: refreshed dependencies with `corepack pnpm install --force`.
  - Final result: exit 0. Known Next dynamic-route warnings still appear during static collection, but routes are emitted as dynamic.

**Built In Slice 2 Locally:**
- Added CSV export support to `GET /api/compliance/reviews?format=csv`.
- CSV output includes review date, user email, deck, question, typed answer, correct answer, answer score, pass/fail, and FSRS self-rating.

**Files In Slice 2 Locally:**
- `apps/web/app/api/compliance/reviews/route.ts`
- `apps/web/app/api/__tests__/compliance-reviews.test.ts`

**Verification Recorded For Local Slice 2:**
- `corepack pnpm --dir apps/web exec vitest run app/api/__tests__/compliance-reviews.test.ts --testNamePattern "CSV"`
  - Red result before implementation: 1 file failed; route still returned JSON.
  - Green result after implementation: 1 file passed, 1 matching test passed.
- `corepack pnpm --dir apps/web exec vitest run`
  - Result: 19 files passed, 130 tests passed.
- `corepack pnpm --dir apps/web exec vitest run app/api/__tests__/compliance-reviews.test.ts`
  - Result after marking the route dynamic: 1 file passed, 4 tests passed.
- `corepack pnpm --filter web build`
  - Initial result: failed because the local Next build worker file was missing.
  - Recovery: refreshed dependencies with `corepack pnpm install --force`.
  - Final result: exit 0. Existing dynamic-route warnings still appear for older API routes, but the compliance route is now explicitly dynamic.

**Built In Slice 3 Locally:**
- Added org-level compliance thresholds for answer-match score and completion rate.
- Added database migration defaults: answer threshold `70`, completion threshold `100`.
- Included thresholds in org settings GET/PATCH.
- Applied the answer threshold to compliance review summaries, items, and CSV export.

**Files In Slice 3 Locally:**
- `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/20260504073000_add_compliance_thresholds/migration.sql`
- `apps/web/lib/schemas/api.ts`
- `apps/web/app/api/org/settings/route.ts`
- `apps/web/app/api/compliance/reviews/route.ts`
- `apps/web/app/api/__tests__/compliance-reviews.test.ts`
- Create: `apps/web/app/api/__tests__/org-settings-compliance.test.ts`

**Verification Recorded For Local Slice 3:**
- `corepack pnpm --dir apps/web exec vitest run app/api/__tests__/compliance-reviews.test.ts app/api/__tests__/org-settings-compliance.test.ts`
  - Red result before implementation: 2 files failed, 3 expected threshold failures.
  - Green result after implementation: 2 files passed, 6 tests passed.
- `corepack pnpm --dir apps/web exec vitest run`
  - Result: 20 files passed, 132 tests passed.
- `corepack pnpm --filter web build`
  - Initial result: failed because the local Next build worker file was missing.
  - Recovery: refreshed dependencies with `corepack pnpm install --force`.
  - Final result: exit 0. Existing dynamic-route warnings still appear for older API routes.

## Decision Log

- 2026-05-03: Chose deterministic word/numeric matching for Phase 2 to avoid per-review LLM cost and latency.
- 2026-05-03: Kept FSRS self-rating because it remains useful for scheduling, but paired it with typed-answer evidence for compliance benchmarking.
- 2026-05-03: Restricted Phase 1 content management to managers while leaving deeper customer-admin governance for later phases.
- 2026-05-03: Phase 3 keeps detailed team/member stats in the Team workspace and makes Stats a role-specific analytics entry point, so managers can drill into team compliance without exposing agent-only routes.
- 2026-05-03: Phase 4 allows managers to invite agents into teams they belong to, but reserves manager-role assignment for customer admins.
- 2026-05-03: Phase 5 is being split into production-safe hardening slices because deck, document, card, assignment, and analytics scope touch many shared routes.
