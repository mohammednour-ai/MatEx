## MatEx Comprehensive Test Plan

This document is a consolidated test plan for the MatEx project derived from `MATEX-MAIN-DEV.md`, `MATEX-MAIN-DEV-UPDATED.md`, and related documentation. It covers interface, cosmetic, functional, integration, E2E, regression and smoke tests, with priorities, acceptance criteria, test data suggestions, and recommended tools.

Scope
- Core marketplace: listings (fixed & auction), images, auctions & bids, orders (Stripe integration), inspections (booking), app settings & KYC, notifications, terms & acceptances, profiles & RBAC, admin dashboard.
- APIs: REST / Next.js App Router server routes (examples: GET /api/settings, POST /api/settings), Supabase interactions, Stripe webhooks.
- UI: public browsing, listing creation, bidding flow, checkout, booking flow, notifications, user onboarding & KYC, admin settings.

Test Plan Structure (per feature)
- Test categories: Smoke, Functional (unit/integration), Interface & Cosmetic (visual), Integration, End-to-End (E2E), Regression suites, Security & Access control, Performance (basic), Accessibility (a11y).
- For each feature we specify: objectives, test cases (happy path + edge cases), priority (P0..P3), acceptance criteria, required test data, and automation notes.

Environments & Tools
- Environments:
  - Local dev (matex/ with .env.local pointing to local/supabase dev project)
  - Staging (mirrors prod secrets except payments use stripe test keys)
  - CI (GitHub Actions or equivalent) for unit/integration/E2E runs
- Recommended tools:
  - Unit tests: Vitest / Jest (TypeScript)
  - E2E: Playwright (multi-browser) or Cypress
  - API contract tests: Pact or Postman/Newman
  - Accessibility: axe-core / Playwright-axe
  - Visual regression: Playwright + Percy or Playwright snapshot comparisons
  - Lint/format: ESLint, Prettier
  - Security: Dependabot, Snyk (optional)

Global Test Data Guidelines
- Use seeded DB fixtures in `supabase/migrations` or a separate seed script for test accounts (buyer, seller, admin), sample listings (fixed/auction), auctions with controlled times, bids, orders with stripe test intents, inspection slots, and KYC field samples.
- Isolate test data per run (use unique identifiers, truncate/test transactions, or separate test schema).

1) Smoke Tests (P0)
- Purpose: Verify the app boots and core flows work end-to-end quickly.
- Minimal tests:
  - App starts and homepage renders (server builds without TypeScript errors).
  - Public browse listings page loads and shows seeded listings.
  - Auth: sign up, sign in, sign out (using Supabase test project).
  - Create listing (seller flow) and verify listing appears public.
  - Start an auction and place a bid (happy path using test auction with short duration).
  - Create fixed-price order and complete Stripe test payment (simulate webhook).
  - Book an inspection slot and verify booking appears in user dashboard.
  - Admin: GET /api/settings returns seeded settings (cache behavior optionally tested).

2) Functional Tests (Unit + Integration) (P0/P1)
- Focus: Business logic, helpers, DB functions, API routes, and validation.
- Targets and examples:
  - Supabase helper functions: sign-in/out wrappers, server/client clients (unit test mocks for @supabase/supabase-js).
  - DB helpers (PL/pgSQL) where possible: get_highest_bid(), is_auction_active(), calculate_platform_fee() — call directly in integration tests against a test DB instance.
  - API routes: `GET /api/settings` (keys param, cache TTL, error handling), `POST /api/settings` (admin-only upsert & audit log). Test role-based responses.
  - Order creation: creating order record, stripe payment intent creation mock, transitions of order status (pending -> paid -> fulfilled).
  - Listing creation: validation (Zod), file uploads (mock Supabase Storage), image ordering.
  - KYC fields: dynamic forms loader and validation logic.

3) Interface & Cosmetic Tests (P1)
- Focus: Visual correctness, layout, responsive design, and UI components.
- Tests:
  - Component snapshot tests for critical UI: ListingCard, AuctionTimer, BidForm, CheckoutSummary, InspectionBooking widget, Profile forms.
  - Responsive checks: home, listing detail, create listing pages at mobile/tablet/desktop widths.
  - Visual regression: baseline screenshots for key pages (home, listing detail, create listing, checkout, admin settings).
  - CSS/Tailwind class regressions: spot-check major UI changes in PRs.

4) Integration Tests (P0/P1)
- Focus: Integration between frontend, API routes, Supabase, and Stripe webhooks.
- Tests:
  - Full create-listing flow: client submits form, backend validates, DB record created, images uploaded, RLS policies respected.
  - Auction lifecycle: create auction, schedule start/end, simulate time to active, place multiple bids, verify highest bid and soft-close extend behavior.
  - Bids: no self-bidding allowed; concurrent bids (simulate quick sequential requests), price increment enforcement.
  - Orders & Payments: create order, create Stripe PaymentIntent (mocked or using Stripe test keys), simulate webhook event (checkout.session.completed or payment_intent.succeeded), verify order status and payouts calculations.
  - Inspections: create inspection slot, multiple bookings until capacity exhausted, booking cancellations and reminders.
  - Notifications: create events (outbid, win, payment) and verify in-app and email templates (email rendered, not necessarily sent in CI).

5) End-to-End (E2E) Tests (P0/P1)
- Use Playwright/Cypress to script user journeys in a real-like environment (staging or CI with test DB):
  - Buyer journey: sign up -> browse -> view listing -> book inspection -> bid (auction) -> win -> pay (Stripe test) -> leave feedback.
  - Seller journey: sign up -> create listing -> respond to inspection booking -> accept an offer or run auction -> receive payout.
  - Admin journey: login -> change app settings (POST /api/settings) -> seed changes, verify audit log and effect across site.
  - Edge E2E: sudden disconnects during checkout, page refresh mid-bid, retryable webhook delivery.

6) Regression Suite (P0/P1)
- Purpose: Prevent previously fixed issues from reappearing.
- Contents:
  - Critical business flows: create listing, auctions, bidding rules, payments, inspections, KYC onboarding, profile updates.
  - Authentication and RLS: ensure users can't access or mutate other users' resources.
  - API contract tests for /api/settings and other admin endpoints.

7) Security & Access Control (P0)
- Tests:
  - RLS policies verification: attempt forbidden CRUD operations from different roles (anon, authenticated non-owner, owner, admin).
  - Input validation: SQL injection patterns, large file uploads, Zod schema boundary testing.
  - Secrets management: ensure .env.example present and secrets not committed (scan repository in CI).

8) Performance (Basic) (P2)
- Smoke perf checks (not full load testing):
  - API response time budget for GET /api/settings (cached) < 200ms in staging.
  - Listing browse page render under realistic seeded dataset (e.g., 10k listings simulated) — use cheap sampling.

9) Accessibility (a11y) (P2)
- Tests:
  - Use axe-core integrated into Playwright to run checks on key pages: homepage, listing detail, create listing, checkout, KYC flow.
  - Ensure color contrast, semantic landmarks, form labels, and keyboard navigation for critical flows.

Acceptance Criteria (example)
- Core: 95% of smoke tests must pass before a merge to `main`; all P0 functional tests must pass in CI for production deploy.
- E2E: nightly E2E run with Playwright on staging; failures create a blocking issue.
- Regression: all regression tests must pass on release branch; failures block release.

Automation Roadmap Suggestions
- Phase 1: Add unit tests (Vitest/Jest) for core helpers and API routes; wire to CI.
- Phase 2: Add Playwright E2E for 3 main journeys (buyer/seller/admin) and run on PRs for critical paths.
- Phase 3: Add visual regression snapshots and integrate with PR guard (Percy or Playwright snapshots).

Test Case Template (for adding to test management system)
- ID: MATEX-S{feature}-{seq}
- Title: short description
- Priority: P0/P1/P2/P3
- Preconditions: seeded data, logged-in as seller/buyer/admin
- Steps: numbered steps
- Expected result: clear assert statements
- Cleanup: how to reset test data

Appendix: Sample High-priority Test Cases (short list)
- MATEX-S01: Smoke - Homepage loads and lists featured listings (P0)
- MATEX-S02: Auth - User signup and auto profile creation (P0)
- MATEX-S03: Listing - Seller creates listing with images and it shows publicly (P0)
- MATEX-S04: Auction - Place bid higher than current highest + enforce min increment; verify highest bidder (P0)
- MATEX-S05: Payment - Create order and simulate Stripe payment webhook, verify order transitions to paid and funds calculations (P0)
- MATEX-S06: Inspections - Book inspection slot until capacity reached, verify blocked further bookings (P0)
- MATEX-S07: Settings API - GET /api/settings?keys=auction,notifications returns only requested keys and cached response flag (P1)
- MATEX-S08: Admin - POST /api/settings upserts settings, audit_log row created, cache invalidated (P1)

Notes & Assumptions
- Assumed the project uses Next.js + TypeScript and Supabase as documented. Tests interacting with Supabase should use a separate test/staging supabase project or transactional test DB patterns.
- Stripe integration should use test keys in non-production environments; use webhook replay or mock webhooks in CI.
- Some DB helper functions are PL/pgSQL and should be run in an integration environment rather than pure unit tests.

Next steps (what I'll do next if you want me to continue)
- Write a structured test-case spreadsheet or JSON export covering all Phase 1 tasks (listings, auctions, orders, inspections, settings) with detailed steps and sample data.
- Add a minimal Playwright E2E suite seed with 3 critical journeys and a GitHub Actions workflow to run them on PRs.
- Add unit test scaffolding (Vitest) and convert a couple of existing helper functions into tested modules.

Requirements coverage
- Source docs used: `MATEX-MAIN-DEV.md`, `MATEX-MAIN-DEV-UPDATED.md`, `MATEX-MAIN-DEV-UPDATED-T064.md` — Test plan maps to core tasks and features described.

Quality gates
- Before merging to main: TypeScript build, unit tests passed, critical E2E smoke passed in CI.

End of test plan
