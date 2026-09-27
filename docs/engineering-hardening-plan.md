# RoomEase engineering hardening plan

Last updated: 2026-09-26

Audit branch: `hardening/phase-0-audit`

Audited commit: `03dfa13f6420d2dfb94da6babf7f6034e0770e04`

## Purpose and constraints

RoomEase is being hardened as an interview-defensible full-stack engineering project. The work will improve reproducibility, boundaries, security, data integrity, testing, delivery, and operational behavior without rewriting the product or adding unrelated features.

Phase 0 is an evidence-gathering phase. Application behavior must remain unchanged. The only Phase 0 repository change is this audit document.

## Phase status

| Phase | Status | Exit evidence |
| --- | --- | --- |
| 0. Establish baseline | Complete | This document; baseline commands recorded below |
| 1. Reproducible dependencies/configuration | Proposed, not started | Awaiting review of the exact change set below |
| 2. Code-quality gates | Not started | — |
| 3. Testable domain layer | Not started | — |
| 4. Database integrity/reproducibility | Not started | — |
| 5. Automated testing | Not started | — |
| 6. CI | Not started | — |
| 7. Deployment/operational behavior | Not started | — |
| 8. Performance/reliability | Not started | — |
| 9. Engineering presentation | Not started | — |

## Phase 0 source-control baseline

- The supplied local path, `D:\Full time Grind\projects\capstone`, contains capstone documents and is not a Git repository.
- The actual checkout found on this machine is `C:\Users\naeema\Downloads\Capstone RoomEase\roomease`.
- The checkout was clean before the audit. No unrelated work was present to preserve.
- The starting branch was `main` at `03dfa13`.
- `main` tracked `origin/main` and appeared two commits ahead, but that is because `origin` points to the original team repository, `https://github.com/farhanv26/roomease.git`.
- The required repository is configured as remote `myrepo`, `https://github.com/kal-A/roomease-capstone.git`. Local `main` exactly matched `myrepo/main` after `git fetch --all --prune` (0 commits ahead, 0 behind).
- Phase 0 uses the new branch `hardening/phase-0-audit`, created from that exact commit.
- No force push, remote setting change, or external repository setting change was made.

Decision: future pushes for this hardening work must target `myrepo`, not the currently tracked `origin`. Renaming/repointing remotes is deferred until it can be done deliberately without obscuring the original team repository.

## Runtime and dependency baseline

Observed locally:

- Node.js `v24.13.1`
- npm `11.8.0`
- Next.js `16.1.6`
- React / React DOM `19.2.3`
- TypeScript `5.9.3`
- NextAuth `4.24.13`
- Supabase JS `2.99.2`; Supabase SSR `0.9.0`
- Tailwind CSS `4.1.18`

Repository configuration findings:

- There is no `engines` field, `packageManager` field, `.nvmrc`, or `.node-version`.
- Both npm v3 `package-lock.json` and Yarn v1 `yarn.lock` are committed, so the intended package manager is ambiguous.
- There is no explicit `typecheck` script.
- There are no test scripts, test runner dependencies, or test configuration files.
- No `.env.example` or other tracked environment template exists. `.gitignore` ignores every `.env*` file.

## Verification results

Commands were run on 2026-09-26 from the clean hardening branch.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm ci` | **Fail** | Lockfile is out of sync. npm reports missing `@supabase/ssr@0.9.0`, `@types/luxon@3.7.5`, `luxon@3.7.2`, and `cookie@1.1.1`. |
| `npm run lint` | **Fail** | 112 findings: 73 errors and 39 warnings. Four errors and two warnings are auto-fixable. |
| `npx tsc --noEmit` | Pass | Exit code 0 under TypeScript 5.9.3. This is not yet exposed as an npm script. |
| `npm run build` | Pass | Next.js 16.1.6 production build compiled, typechecked, generated 35 routes/pages, and exited 0. |
| `npm audit --json` | **Fail** | 18 vulnerable dependency entries: 2 critical, 11 high, 4 moderate, 1 low. Direct vulnerable dependencies are `next` (critical; compatible fix offered at 16.3.6), `next-auth` (critical; fix available), and `xlsx` (high; no npm-registry fix offered). `--omit=dev` reports the same counts. |

The build succeeding does not supersede the failing lint or clean-install gates. It also does not prove the application can authenticate or reach its database because no local environment configuration is present.

### Lint failure classes

- Conditional hooks in `RoomDetailsModal.tsx` and `TimeBar.tsx`.
- Effects that synchronously set state in the booking page and local stores.
- Incorrect/manual memoization dependencies in the booking page and `TimeBar`.
- Many explicit `any` values in UI and route code.
- CommonJS `require()` calls in maintenance scripts under an ESLint configuration that forbids them.
- Unused values, stale suppressions, and minor `prefer-const` findings.

The previously reported total of about 73 errors and 39 warnings is exact for the current checkout.

## Application inventory

### Pages and API routes

- 16 `page.tsx` files.
- 19 API route-handler files.
- 39 reusable TSX components.
- No automated test/spec files.
- No `.github` directory or GitHub Actions workflows.

Authenticated user pages are `/`, `/analytics`, `/book`, `/bookings`, `/compare`, `/dashboard`, `/exec/requests`, `/rooms`, and the leftover `/supabase-todos` sample. Admin pages are `/admin`, `/admin/analytics`, and `/admin/approvals`. Explicitly public pages are `/auth/signin`, `/auth/error`, and `/learn-more/about`; `/learn-more/why-roomease` currently exists but is protected by middleware.

API areas:

- NextAuth: `/api/auth/[...nextauth]`.
- Member/executive workflow: `/api/booking-requests` and `/api/booking-requests/[id]`.
- Booking read/write: `/api/bookings/create`, `/api/bookings/mine`, `/api/bookings/by-room`, and `/api/bookings/[id]`.
- Membership and availability: `/api/club-memberships`, `/api/blockers/by-date`.
- Administration: analytics, blockers, booking list, approve, deny, request changes, and undo under `/api/admin/*`.
- `/api/bookings/admin` is a duplicate legacy-style admin list endpoint; the active UI uses `/api/admin/bookings`.

### Largest implementation units

| File | Lines | Concern |
| --- | ---: | --- |
| `src/app/admin/approvals/page.tsx` | 1,230 | Admin fetching, mapping, state, filtering, dialogs, and presentation are coupled. |
| `src/app/(protected)/book/page.tsx` | 1,135 | Search, recommendation, availability, submission, workflow branching, and presentation are coupled. |
| `src/app/(protected)/bookings/page.tsx` | 831 | Persistence mapping, ownership behavior, editing, and presentation are coupled. |
| `src/app/admin/analytics/page.tsx` | 685 | Data presentation and chart behavior are coupled. |
| `src/app/(protected)/analytics/page.tsx` | 533 | Client-derived analytics depend on browser booking state. |

The previous audit's “about 1,100 lines” booking-page finding remains true, but it missed that the admin approvals page is now larger.

## Architecture and state boundaries

### Confirmed persistence split

Supabase is used through server API routes for:

- `rooms`
- `bookings`
- `room_blockers`
- `club_memberships`
- `booking_requests`

The `/supabase-todos` sample also reads `todos`, but this is not part of the RoomEase domain.

Browser-local state is used for:

- A booking projection and local confirmation sequence (`bookingsStore.tsx`).
- Room comparison IDs (`compareStore.tsx`).
- Reviews/ratings (`reviewsStore.ts`).
- Theme, participant recents, and admin portal display mode.
- A legacy local blocker store that is currently unreferenced.

The room catalog is static repository JSON, while room approval policy is read from Supabase and also duplicated in a small static metadata overlay. This creates multiple sources of truth for room facts and approval behavior.

`/bookings` is the only user page that hydrates the global browser booking store from Supabase. The dashboard, comparison availability, and user analytics consume that store without fetching first, so they can be empty or stale until the user visits `/bookings` in the same browser session.

### Current boundaries

- NextAuth/Azure AD is the authentication boundary.
- API routes are both the authorization and persistence boundary because they use a Supabase service-role client that bypasses RLS.
- Most authorization, transition, and validation rules remain inline in route handlers.
- `src/lib/server/insertBookingCore.ts` is the one meaningful shared server service. It validates time ordering, determines the initial status, checks blockers/conflicts, and inserts a booking.
- UI components also repeat recommendation, availability, conflict, status-normalization, and approval-policy logic.

### Authentication and authorization

- Azure AD sign-in is restricted to emails ending in `@uwaterloo.ca`; the tenant defaults to `common`.
- Two administrators, one executive, and one member are mapped by hard-coded personal email addresses.
- Every other authenticated Waterloo account defaults to `member`.
- Admin page/layout and API access use the hard-coded admin list/session flag.
- Member/executive APIs add role, target-email, membership, or ownership checks depending on the route.
- The “admin user view” setting is visual only; it does not reduce admin privileges.
- A named demo member is allowed to bypass persisted club membership and is routed to a named demo executive in production route code. This override is not gated by `NODE_ENV` or a production-safe server flag.
- A member may submit a `targetExecutiveEmail`; when supplied, the server does not verify that address is an executive of the selected club. An executive may likewise supply `clubName` for a direct booking without proving membership in that club. These are authorization/provenance gaps even though the caller must be authenticated.
- `NEXT_PUBLIC_DEMO_MODE` has a helper, but that helper is unused. The hard-coded route override and other mock/demo data do not depend on it.

No committed secret values were found. The risk is environment-specific identity and demo behavior in production logic, not a checked-in credential.

## Booking lifecycle trace

1. **Search and recommendation.** `/rooms` filters the static room catalog. Its “Recommended” sort is actually building then room number. `/book` applies client-side capacity/building/AV/furniture hard filters and ranks by capacity closeness plus selected AV weights. It does not query all live room bookings before presenting the ranked list.
2. **Role fork.** A member submits a recommendation request; an executive or administrator submits a booking directly.
3. **Member recommendation.** `POST /api/booking-requests` verifies the member and club relationship, except for the hard-coded demo bypass, then inserts `pending_exec_review`.
4. **Executive review.** `/exec/requests` reads requests targeted to the signed-in executive. A deny sets `denied_by_exec`. An approval calls the shared booking insert service with member/executive provenance.
5. **Booking insertion.** Approval-required rooms become `pending` for a non-admin and `approved` for an admin; other rooms become `confirmed`. Active room/building blockers and overlapping statuses (`pending`, `approved`, `confirmed`, `changes_requested`) are checked before insert.
6. **Forwarding to admin.** If executive approval creates a pending booking, the request becomes `submitted_for_admin`; otherwise it becomes `completed` and stores the booking ID.
7. **Admin review.** The admin UI fetches bookings and can approve, deny, request changes, or undo. The handlers update booking status/review columns directly.
8. **Changes.** A non-member booking owner can edit a booking. The server rechecks blockers/conflicts and returns an approval room to `pending`, otherwise to `confirmed`. For a member-originated request, the executive is the booking owner; the member can observe but not edit it.
9. **Undo.** Admin undo derives room policy again, restoring `pending` or `confirmed` and clearing review fields.

### Workflow integrity gaps

- Executive approval inserts the booking and then updates the request in two separate operations. If the second operation fails, a booking exists while the request remains pending.
- Final admin approve/deny/change/undo actions do not update the linked `booking_requests` row, so a request can remain `submitted_for_admin` permanently.
- Admin mutation endpoints do not enforce a canonical allowed transition or compare the current state; UI gating is the only transition guard for those actions.
- Booking overlap protection is a select-then-insert check. The code recognizes a PostgreSQL exclusion constraint named `bookings_no_overlap`, but no committed migration creates it. Two concurrent requests can therefore both pass the application check unless the unversioned live database happens to contain that constraint.
- Status values are free-form text in the committed migration. There is no versioned enum/check constraint defining the state machine.
- Admin blocker creation compares Luxon's `toMillis` functions rather than calling them. An end time before the start time can pass application validation, and no committed database check rejects it.

## Recommendation and availability findings

There is no canonical recommendation implementation:

1. The active booking wizard filters and ranks with capacity/AV weights.
2. `src/lib/demo.ts` contains a separate 100-point match scorer used only by an apparently dead `MatchScoreExplanation` component.
3. The Rooms page labels an alphabetical building/room-number ordering as “Recommended.”

Availability and conflict logic is also repeated in the booking UI, edit UI, display components, and server insertion/update handlers. The server is the only layer with potentially complete Supabase data. Non-direct recommendations can be described as available without checking all live bookings for all listed rooms.

These are Phase 3 concerns. Phase 1 must not change matching, availability, or workflow behavior.

## Database reproducibility and integrity

Only one migration is committed: `20260313120000_role_workflow.sql`.

It creates:

- `club_memberships`
- `booking_requests`
- indexes for membership/request lookup
- five provenance columns on `bookings`

It does not create the base objects the application requires:

- `rooms`
- `bookings`
- `room_blockers`
- required review/status columns on `bookings`
- the `bookings_no_overlap` constraint anticipated by application code
- enums or status/time check constraints
- RLS enablement or policies
- a reproducible Supabase project configuration and SQL seed

The migration references `public.bookings(id)` and alters `public.bookings`; therefore it cannot apply successfully to a truly empty database by itself. A fresh local Supabase instance cannot be reconstructed from the repository.

The JavaScript room-sync and demo-booking scripts depend on an already provisioned remote schema. The demo seed is dry-run by default and requires `--apply`, but it has no additional production-environment guard.

Reviews/ratings are currently local-only. Analytics are derived from bookings rather than a separate analytics table.

## Testing, CI, operations, and accessibility baseline

- No unit, integration, or end-to-end tests exist.
- No deterministic test authentication mechanism exists.
- No GitHub Actions workflows exist.
- No health endpoint, structured logging abstraction, or monitoring integration exists.
- Several routes return raw database error messages/codes or silently convert database failures to empty data, producing inconsistent failure behavior.
- Development logging is present in booking time and mutation paths.
- Booking error logs can include full insert/update payloads with organizer and booker data.
- The room-availability endpoint returns organizer/booker names for arbitrary room/date queries by any authenticated user; its privacy masking covers email/event fields but not those names.
- Conditional-hook lint failures are correctness risks, not formatting issues.
- Several modal overlays lack dialog semantics/focus contracts, and time-bar segments use click-only `role="button"` elements without keyboard handling or an accessible name. These are confirmed accessibility defects; a complete accessibility audit remains deferred.
- The production build proves compilation only. Authenticated responsive flows, contrast, accessible status announcements, database outage behavior, Azure failure behavior, and concurrent booking behavior were not exercised in Phase 0 because no reproducible environment or test harness exists.

## Dependency/security findings

The current audit reports 18 vulnerable dependency entries in the installed/locked graph, including two direct critical packages and one direct high package:

- `next@16.1.6`: critical; npm offers a compatible 16.3.6 fix.
- `next-auth@4.24.13`: critical; a fix is available.
- `xlsx@0.18.5`: high; npm reports no fix. Repository usage is limited to the trusted local room-conversion script, not request handling, but it is currently a production dependency.

These results are time-sensitive and must be regenerated during Phase 1. No dependency was upgraded during the baseline audit.

## Major engineering risks, ordered

1. **Database/concurrency integrity.** The repository cannot create its schema, and its booking overlap check is not atomic without an uncommitted database constraint.
2. **Authorization and demo leakage.** Production authorization depends on personal-email constants and a live demo bypass while all database access uses a service-role client that bypasses RLS.
3. **Authorization/provenance validation.** Caller-supplied executive and club fields are not fully checked against persisted membership.
4. **Workflow consistency.** Multi-step request/booking changes are not transactional, admin transitions are not centralized, and linked request status is not kept in sync.
5. **Input/data invariants.** A blocker time-ordering bug and missing database checks permit invalid records.
6. **Dependency exposure.** Clean install is broken and the current production graph includes direct critical/high advisories.
7. **No regression protection.** There are no tests or CI gates around booking, authorization, time, conflicts, or workflow behavior.
8. **State/source-of-truth drift.** Static room data, static policy overlays, Supabase rows, and localStorage projections can disagree.
9. **UI correctness and accessibility.** Conditional hooks, effect-state cycles, missing keyboard/dialog contracts, explicit `any`, and 800–1,200-line pages make safe changes difficult.
10. **Privacy/failure handling.** Over-broad availability responses, raw persistence errors, PII-bearing logs, swallowed failures, and unstructured logging create exposure and diagnostic risk.

## Comparison with the previous audit

Confirmed without material contradiction:

- Next.js 16, React 19, TypeScript, Supabase, Azure AD/NextAuth.
- Exactly 19 API route files and the described member/executive/admin workflows.
- `npm ci` lockfile mismatch.
- Exactly 73 lint errors and 39 warnings, including conditional hooks/dependency issues.
- No tests and no GitHub Actions.
- A roughly 1,100-line booking page and duplicated recommendation logic.
- Hard-coded admin/demo identities.
- Incomplete migrations and inability to rebuild the database from the repository.
- Successful production build.
- Vulnerable dependencies and incomplete setup documentation.

Differences or refinements:

- The supplied local repository path is not the checkout; the repository is under Downloads.
- Local `main` matches the requested `kal-A/roomease-capstone` remote, but tracks a different original-team `origin` remote.
- The booking page is 1,135 lines; the 1,230-line admin approvals page is now the largest source file.
- Recommendation duplication is broader than two copies: the booking ranker, dead demo score, and Rooms “Recommended” sort all differ.
- Some server-side booking logic has already been consolidated into `insertBookingCore`, so creation validation is not completely duplicated.
- Toronto-local conversion is already centralized with Luxon, but has no tests for invalid calendar/time values or DST boundaries.
- The migration gap is more severe than missing columns: the only migration cannot run on an empty database because it references a missing `bookings` table.
- The current dependency audit is concrete: 18 vulnerable entries, with direct critical findings in Next.js and NextAuth and an unresolved high finding in XLSX.
- Additional risks not highlighted previously include stale browser-store consumers, non-transactional executive approval, missing propagation of admin decisions to request state, and an unused sample `/supabase-todos` page.

## Phase 0 decisions and deferrals

- Do not change product behavior in Phase 0.
- Do not treat the successful build as a green quality gate.
- Do not repair schema, workflows, recommendation logic, or lint yet; those belong to their planned phases and require tests.
- Do not claim live database constraints or RLS exist merely because the current hosted database may contain objects not represented in Git.
- Treat API routes as the current security boundary until RLS and a less privileged data-access design are implemented and tested.
- Preserve the legitimate controlled user-study results in the README, but validate their source and wording during Phase 9 rather than inventing new impact claims.

## Exact proposed Phase 1 change set

Phase 1 will be limited to dependency/configuration reproducibility and production-safe demo/identity configuration. It will not alter recommendation, booking, approval, or UI behavior when equivalent environment values are supplied.

### Commit 1: choose and enforce one toolchain

- Update `package.json` with Node 24 engine bounds, npm 11 package-manager metadata, and an explicit `typecheck` script.
- Add `.nvmrc` for Node 24.
- Regenerate `package-lock.json` with npm 11 so `npm ci` succeeds.
- Remove the competing `yarn.lock` after confirming npm is the intended package manager.
- Verify from a removed/recreated `node_modules`: `npm ci`, `npm run typecheck`, and `npm run build`.

### Commit 2: dependency security maintenance

- Upgrade Next.js to the npm-audit-offered compatible fixed release (currently 16.3.6) and NextAuth to a fixed 4.24.x release, keeping React and the overall stack unchanged.
- Re-run build/typecheck/lint to identify compatibility regressions; do not use `--force` or accept a semver-major audit fix silently.
- Move `xlsx` to `devDependencies` because it is used only by the trusted local conversion script.
- Document the XLSX advisory as a scoped exception if no maintained npm-registry fix is available: no uploaded/untrusted workbook parsing, local trusted input only, and no production runtime import. Do not fabricate a “fixed” status.
- Record fresh `npm audit` and `npm audit --omit=dev` results.

### Commit 3: explicit environment contract

- Update `.gitignore` to allow a tracked `.env.example`.
- Add `.env.example` with empty/documented entries for Azure AD, NextAuth, Supabase public keys, the server-only service role key, configured admin identities, and explicit demo controls.
- Add configuration documentation explaining public versus server-only variables, Azure/Supabase prerequisites, callback URL expectations, and local startup.
- Add small validated server/public configuration helpers and replace duplicated Supabase environment reads without changing data access behavior.
- Fail with a clear configuration error at the server boundary instead of relying on non-null assertions.

### Commit 4: remove production identity/demo constants

- Move administrator identities out of `auth.ts`/`userRole.ts` into validated server configuration.
- Remove client-side email-to-privilege fallback; clients consume the role already attached to the authenticated session and otherwise default to least privilege.
- Isolate named demo member/executive mappings behind a server-only opt-in that is rejected when `NODE_ENV=production`.
- Gate mock directory/demo content so it cannot influence production authorization or booking submission.
- Keep demo seed data in the seed script, but require both `--apply` and an explicit server-side acknowledgement variable; refuse to apply when production mode is set.
- Add focused configuration tests only if a minimal test runner is introduced coherently here; otherwise record the exact manual verification and make these the first tests in Phase 5. Do not add a broad testing framework prematurely just for configuration.

### Commit 5: Phase 1 verification/documentation

- Update this document with actual changed files, decisions, audit output, limitations, and rollback notes.
- Verify `npm ci`, `npm run typecheck`, `npm run build`, production-mode demo rejection, and absence of personal-email constants from production `src/` logic.
- Run `npm run lint` and record its expected Phase 2 failures without suppressing them.
- Make no database migration, recommendation, workflow, or UI refactor in Phase 1.

## Phase 0 completion record

- Application behavior changed: **No**.
- Source/configuration changed: **No**.
- Documentation changed: **Yes; this file only**.
- Relevant commands run and recorded: **Yes**.
- Atomic Phase 0 commit: recorded in Git history for this document.
- Phase 1 started: **No**.
