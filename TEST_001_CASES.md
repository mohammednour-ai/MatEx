# TEST_001_CASES.md

Brief: Create a complete test-case matrix and plan for MatEx covering smoke, regression, functional, UI, integration, E2E and performance tests, with priorities, owners, automation guidance, test data and CI integration notes.

Checklist
- [x] Provide test strategy and scope mapping to project areas (Auth/KYC, Listings, Auctions, Deposits/Payments, Inspections, Admin, Notifications, Search, Legal, Settings).
- [x] Provide smoke test suite (minimal critical paths).
- [x] Provide regression suite grouping.
- [x] Provide functional test cases (detailed steps, preconditions, expected results) for key flows.
- [x] Provide UI test checklist and component-level tests.
- [x] Provide integration tests and contracts (API⇄DB, 3rd-party: Stripe, Supabase storage/auth).
- [x] Provide E2E scenarios (happy path + edge cases) and test data strategy.
- [x] Provide performance test scenarios and key metrics/thresholds.
- [x] Provide test environment, test data, CI integration, automation recommendations, and ownership suggestions.

## 1. Overview & Goals
- Goal: provide a runnable, prioritized test matrix ensuring product quality for releases and safe iteration. Focus areas: user auth & KYC, listing lifecycle, auctions/bidding, deposit/payment flows, admin tools, notifications, legal acceptance, and core UX.
- Test types defined:
  - Smoke tests: minimal set run on every deploy to verify core functionality.
  - Regression tests: broader automated suite covering past defects and core features.
  - Functional tests: API/unit-level verification of business logic.
  - UI tests: component and visual checks (responsiveness, accessibility basics).
  - Integration tests: DB + API + 3rd-party interactions (Stripe, Supabase Storage/Auth).
  - E2E tests: full user journeys (signup → KYC → list → inspect → deposit → bid → win → invoice → pay → fulfilment).
  - Performance tests: load tests for critical endpoints and background jobs.

## 2. Test Environments
- Local dev: for unit/component tests (mock Supabase, Stripe with test keys). Use docker-compose or local supabase emulator if available.
- CI (staging): ephemeral environment per PR with supabase staging DB and real test Stripe account (secrets injected). Runs smoke & regression suites.
- Staging (persistent): run full E2E and performance scenarios before release.
- Prod (limited): run synthetic smoke & monitoring; do not run destructive tests.

Environment configuration
- Provide `TEST_` prefixed env variables via CI: TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, TEST_SUPABASE_SERVICE_ROLE_KEY, TEST_STRIPE_SECRET_KEY (test), TEST_STRIPE_WEBHOOK_SECRET, TEST_STORAGE_BUCKET.
- DB: use snapshot/migrations seed + deterministic test fixtures per run.

## 3. Test Data Strategy
- Use seeded deterministic fixtures where possible (users: buyerA, sellerA, adminA; listings: sample-steel-001; auctions: auction-001).
- For privacy/security flows, use dedicated test KYC docs (non-PII dummy files) stored in test storage buckets.
- Use separate Stripe test customer IDs and PaymentIntent/stubs; record test ids in fixtures.
- Clean-up policy: all created resources in staging must be marked and cleaned by teardown jobs; retention window for audit tests only.

## 4. Smoke Test Suite (run on every deploy)
Purpose: fast verification of critical paths (≈ 10 tests, ~2–5 minutes).

Smoke-01: Signup and login
- Type: E2E (fast)
- Steps: create test user (email), complete email login flow (passwordless or stub), verify session, access profile page
- Expected: user authenticated and profile returns 200

Smoke-02: Create listing (seller)
- Type: API/UI
- Steps: seller signs in, creates listing with title, price, image; listing visible in /browse
- Expected: listing created, listing_id returned, visible in browse results

Smoke-03: Start auction + place bid
- Type: API
- Steps: create auction for listing, place a valid bid (>= minNextBid)
- Expected: bid accepted, current_highest updated

Smoke-04: Deposit authorization
- Type: API
- Steps: buyer authorizes deposit (PaymentIntent simulated)
- Expected: deposit record created, PaymentIntent id linked, deposit_status authorized

Smoke-05: Checkout fixed-price flow
- Type: API
- Steps: create checkout session for fixed listing, simulate checkout.session.completed webhook
- Expected: order created with status=paid

Smoke-06: Stripe webhook handling
- Type: Integration
- Steps: send test webhook for payment_intent.succeeded and checkout.session.completed
- Expected: webhook processed, order/payment updated, idempotency safe

Smoke-07: Notifications basic
- Type: API
- Steps: trigger a notification-generating event (new bid), query unread count
- Expected: notification created, unread count increments

Smoke-08: Terms acceptance gating
- Type: API/UI
- Steps: call POST /bid as user without latest terms acceptance
- Expected: 403 or explicit acceptance required response

Smoke-09: Admin login & audit viewer
- Type: UI/API
- Steps: admin login, open /admin/audit log
- Expected: audit events visible

Smoke-10: Legal pages accessible
- Type: UI
- Steps: visit /legal/terms and /legal/privacy
- Expected: pages render 200 and contain version meta

## 5. Regression Test Suites (grouped by area)
- Run on nightly or pre-merge for main branches; automated where possible.

5.1 Auth & KYC
- REG-A01: signup flow validation (email, KYC file upload edge sizes)
- REG-A02: KYC admin approve/reject + notifications
- REG-A03: onboarding state transitions + blocked actions

5.2 Listings
- REG-L01: create/edit/delete listing permissions (seller vs other)
- REG-L02: image uploads and primary image selection
- REG-L03: schedule_at and expiry behavior (publish/expire)

5.3 Auctions & Bids
- REG-B01: minNextBid calculation (fixed/percent)
- REG-B02: soft-close extension behavior under concurrent bids
- REG-B03: realtime subscription correctness (subscribe/unsubscribe)

5.4 Deposits & Payments
- REG-P01: PaymentIntent creation & linking to orders
- REG-P02: deposit release/capture/refund logic
- REG-P03: webhook idempotency (duplicate events)

5.5 Orders & Invoicing
- REG-O01: invoice generation and amounts (fee deduction)
- REG-O02: order status transitions (pending → paid → fulfilled)

5.6 Notifications
- REG-N01: template rendering with variables
- REG-N02: channel preference handling (inapp/email)

5.7 Admin & Settings
- REG-AD1: app_settings CRUD and cache invalidation
- REG-AD2: audit_log entries created for critical changes

5.8 Legal & Consent
- REG-LG1: terms version change forces re-acceptance
- REG-LG2: DSAR export exposes only user's data

5.9 Integrations
- REG-I01: Stripe test flows for checkout & PaymentIntent
- REG-I02: Supabase Storage upload/download + signed URL expiry

## 6. Functional Test Cases (representative detailed cases)
Each functional test case should map to a small unit of business logic and be written as automated unit/integration tests where possible.

Format: ID | Title | Preconditions | Steps | Expected

FNC-001 | validate minNextBid computation
- Preconditions: auction settings with min_increment_strategy
- Steps:
  1. Create auction with starting price 100 and min_increment_value 5
  2. Simulate current_highest = 100
  3. Call minNextBid helper
- Expected: minNextBid = 105

FNC-002 | soft-close extends auction end
- Preconditions: auction with 30s remaining and soft_close_seconds=60
- Steps:
  1. Place bid within remaining window
  2. Verify auction.end_at increased by soft_close_seconds
- Expected: end_at extended to now + previous_remaining + 60s

FNC-003 | settings cache invalidation
- Preconditions: app_settings cached
- Steps:
  1. POST /api/settings as admin to change key
  2. Read GET /api/settings immediately
- Expected: returned value reflects update (cache invalidated)

FNC-004 | webhook signature verification
- Preconditions: stripe webhook secret configured in env
- Steps:
  1. POST webhook payload with correct signature
  2. POST same webhook payload again (duplicate)
- Expected: first processed, second recognized as duplicate and ignored (idempotent)

FNC-005 | terms acceptance gating
- Preconditions: terms_version incremented
- Steps:
  1. POST /api/auctions/{id}/bid without acceptance
  2. Then accept terms and retry
- Expected: first fails with 403, second succeeds

## 7. UI Test Checklist & Component Tests
- Component unit tests (Jest/React Testing Library) for:
  - `SearchBar` (input, saved-search button, URL sync)
  - `ListingCard` (images, price, seller badge, watch toggle)
  - `AuctionDisplay` (current price, minNextBid, soft-close indicator)
  - `DepositStatus` (various PaymentIntent states)
- Accessibility smoke checks (axe-core) for main pages: landing, browse, listing, checkout, admin.
- Visual regression: capture snapshots for listing card, hero, checkout flow across breakpoints.

UI Test Cases (examples)
- UI-001: SearchBar retains URL params after navigation
- UI-002: ListingCard image carousel keyboard navigation
- UI-003: Bid form validation shows helpful error messages
- UI-004: Mobile layout—listing card stacks vertical and CTAs remain accessible

## 8. Integration Tests
- Contract tests for API ↔ DB: run migration in ephemeral DB then run integration tests that exercise CRUD operations and RLS where applicable.
- Stripe integration: use Stripe test keys and run simulated PaymentIntent lifecycle and webhook event flow. Assert mapping of Stripe ids to orders.
- Supabase Storage integration: upload/download signed URLs, assert file existence and deletion by retention worker.
- Notification integration: create event, ensure notification row created and email renderer returns expected HTML (no external sending in CI; stub SMTP).

Integration test seeds (CI):
- Create adminA, sellerA, buyerA with deterministic ids
- Seed listing+auction+order fixtures
- Pre-create Stripe test customer and record ids

## 9. E2E Test Scenarios
Priority: cover happy path + critical edge cases. Automate via Playwright or Cypress against staging.

E2E-01: Buyer happy path (fixed price)
- Flow: signup → accept terms → browse → buy fixed listing → stripe checkout flow (test) → order status paid → view receipt
- Assertions: user sees checkout success page, order created, invoice accessible

E2E-02: Auction happy path
- Flow: seller lists auction → buyer authorizes deposit → place bid → other buyer outbids → auction closes → winner invoice created → capture deposit → order created
- Assertions: bids persisted, outbid notifications to previous highest, winner invoice matches winning bid

E2E-03: Dispute lifecycle
- Flow: buyer files dispute with evidence → admin reviews → admin resolves refund/partial refund → notifications sent
- Assertions: dispute recorded, admin can change status, refund processed (simulated)

E2E-04: DSAR export
- Flow: user requests DSAR export → job runs → signed URL available → user downloads zip
- Assertions: zip created containing JSON of user data and files, audit entry created

E2E-05: Onboarding/KYC to sell
- Flow: signup as seller → upload KYC docs → admin approves → seller can list
- Assertions: onboarding state transitions, notifications sent at each step

E2E-06: Saved-search & price-watch
- Flow: create saved search with criteria → create listing matching criteria → user receives notification
- Assertions: saved_search entry exists, notification created within acceptable time window

## 10. Performance & Load Testing
Goal: identify bottlenecks and ensure SLA for critical endpoints.

Targets (example)
- Browse listing (GET /browse) — 95th percentile latency < 500ms under 100 RPS
- POST /api/auctions/{id}/bid — p95 < 300ms under 50 concurrent bidders on same auction (simulate contention)
- Webhook handler — able to process 200 events/sec with < 200ms per event (scale horizontally)
- Background job (escrow release worker) — process 1000 eligible orders/hour without backlog

Scenarios
- PERF-01: simulated spike — 500 concurrent users browsing + 50 concurrent bids spread across 20 auctions for 5 minutes
- PERF-02: webhook storm — replay 1000 webhook events in burst, measure processing time and DB lock contention
- PERF-03: CSV import large job — import 10k rows with images (dry-run + actual); measure job duration and memory usage

Tools
- k6 or Gatling for HTTP load tests
- Locust for complex user-behavior workloads
- Measure CPU/RAM, DB locks, query times, and queue lengths

Acceptance Criteria
- No errors > 1% during sustained load
- Latency at defined thresholds per endpoint and percentile
- No unbounded queue growth; worker can clear backlog within X hours

## 11. Test Automation & CI Integration
- Recommended CI flows:
  - PR: run unit tests, lint, component tests, and fast integration smoke tests (mock external services)
  - Nightly: run full regression suite (integration + DB + API)
  - Pre-release (staging): run full E2E + performance tests against staging environment
- Store test artifacts: Playwright traces, recordings, screenshots, k6 result summaries, and test DB snapshots.
- Use test tags to group suites (smoke, reg, e2e, perf) and run subset per pipeline.

CI example (GitHub Actions)
- .github/workflows/ci.yml: matrix: node, run jest, run eslint, run unit/component tests, run smoke tests
- .github/workflows/e2e.yml (manual trigger): spin staging, run Playwright E2E, collect artifacts

## 12. Observability & Test Flakiness Handling
- Add retries for flaky UI steps (with short backoff) and idempotent APIs in tests
- Track flaky tests in a dashboard and quarantine failing tests pending fix
- Capture logs and DB state on failure (snapshot) for postmortem

## 13. Test Ownership & Run Cadence
- Ownership suggestions:
  - QA Engineer: full E2E, regression strategy, test data management
  - Backend Dev: API integration tests and performance scenarios
  - Frontend Dev: component tests & UI snapshots
  - DevOps: CI pipelines, staging environment
- Recommended cadence:
  - Smoke: on every deploy
  - PR unit/component: on every PR
  - Regression: nightly and pre-merge to main
  - E2E: nightly in staging and before major releases
  - Perf: weekly or before release for high-risk areas

## 14. Reporting & Exit Criteria
- For each run emit: pass rate, failed test list, flakiness score, average run time, and artifacts links
- Release exit criteria example:
  - Smoke: all tests pass
  - Regression: >= 95% pass, critical tests pass (list)
  - E2E: core journeys pass
  - Performance: meet defined p95/p99 thresholds or documented exception

## 15. Appendix: recommended minimal test case matrix (IDs and one-line descriptions)
- SMK-01 Signup/login
- SMK-02 Create listing
- SMK-03 Place bid
- SMK-04 Authorize deposit
- SMK-05 Checkout fixed-price
- SMK-06 Webhook processing
- SMK-07 Notifications
- SMK-08 Terms gating
- REG-A01..A03 Auth/KYC regressions
- REG-L01..L03 Listings regressions
- REG-B01..B03 Auctions regressions
- REG-P01..P03 Payments regressions
- FNC-001..FNC-005 Functional core helpers
- UI-001..UI-004 UI checks
- E2E-01..E2E-06 End-to-end journeys
- PERF-01..PERF-03 Performance scenarios

---

*File created: TEST_001_CASES.md*
