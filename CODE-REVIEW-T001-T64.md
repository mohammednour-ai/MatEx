T001 — Bootstrap repo
Status / artifacts: Completed. matex Next.js app created; commit 4920513.
Findings: Repo boots; mismatch: project rules require Next.js 14 but the bootstrap used 15.5.2. No CI or pinned Node declared.
Main risk: Version drift will break future assumptions and CI/tooling.
Recommendation: Choose and pin one Next major (prefer Next 14 per rules) and add .nvmrc / engines + minimal CI that runs npx tsc --noEmit and npm run build.
Test: Run fresh clone → npm ci → npx tsc --noEmit → npm run build.
T002 — VS Code workspace & settings
Status / artifacts: .vscode/extensions.json and settings.json added.
Findings: Good developer onboarding; some IDE-only schema warnings noted.
Risk: Developers may have inconsistent local formatting if editor settings ignored.
Recommendation: Add README note to apply workspace settings and optionally enforce with husky + lint-staged.
Test: Open workspace and verify recommended extensions appear and format-on-save works.
T003 — EditorConfig + Prettier
Status: Completed.
Findings: Rules set (2 spaces, LF, single quotes); Prettier applied across files.
Risk: Prettier rules must match lint rules (ESLint) to avoid churn.
Recommendation: Add ESLint config aligning with Prettier, add CI check prettier --check.
Test: npx prettier --check . should pass.
T004 — Env templates
Status: Completed, .env.example present.
Findings: Key environment variables included; clear separation public/private.
Risk: Real secrets accidentally committed—verify.
Recommendation: Add .env to .gitignore and documentation for secret rotation.
Test: Validate .env.example documents steps to obtain keys.
T005 — Supabase client helpers
Status: Completed, src/lib/supabaseServer.ts & supabaseClient.ts.
Findings: Server/client helpers created; note for generated DB types left as TODO.
Risk: Missing typed DB definitions may cause runtime/typing gaps.
Recommendation: Generate and commit Supabase types (pgtyped or supabase types) and add runtime validation wrappers.
Test: npx tsc --noEmit and a smoke call to server helper against a dev DB.
T006 — Profiles + RBAC schema
Status: Completed, migration 001_profiles_rbac.sql.
Findings: Comprehensive RBAC and triggers; automatic profile creation on signup.
Risk: RLS policies rarely tested end-to-end—possible permission gaps.
Recommendation: Add integration test exercising anon/auth/admin queries against a test DB.
Test: Run migration on a test DB and verify RLS: auth user can only CRUD own profile.
T007 — Listings + Images schema
Status: Completed, 002_listings_images.sql.
Findings: Indexed fields and image metadata included.
Risk: Storage lifecycle / broken image references not covered.
Recommendation: Add cleanup job for orphan images and test unique primary image constraint.
Test: Create listing with images, change primary image, assert DB constraints.
T008 — Auctions & Bids schema
Status: Completed, 003_auctions_bids.sql.
Findings: Soft close, helper functions implemented; constraints include no self-bid.
Risk: Race conditions in bidding need transactional coverage.
Recommendation: Add DB-level uniqueness or constraints plus transaction tests for concurrent bids.
Test: Simulate concurrent bids to ensure get_highest_bid() and inserts remain consistent.
T009 — Orders schema
Status: Completed, 004_orders.sql.
Findings: Tracks payment intent, fees and payout fields.
Risk: Payment state transitions could be inconsistent without webhook/retry checks.
Recommendation: Harden order state machine with idempotency keys and webhook reconciliation job.
Test: Create order, simulate Stripe webhook events, verify status transitions.
T010 — Inspections schema
Status: Completed, 005_inspections.sql.
Findings: Slots, capacity, and booking table created with constraints.
Risk: Timezone and DST edge cases for slot scheduling.
Recommendation: Enforce timestamptz, test boundaries across time zones, and validate unique-slot constraints.
Test: Create slots near DST change and book; assert correct behaviors.
T011 — App settings schema
Status: Completed, 006_app_settings_kyc.sql.
Findings: JSONB storage, helper functions, seeded defaults.
Risk: Schema implicit assumptions about JSON shape; breaking changes possible.
Recommendation: Add JSON schema validation (Zod) in API layer and migration docs for breaking changes.
Test: API returns expected default settings and rejects malformed updates.
T012 — Notifications schema
Status: Completed, 007_notifications.sql.
Findings: Templates + notifications tables with channels and templates seeded.
Risk: Email channel relies on external SMTP; fallback/stub behavior must be clear.
Recommendation: Ensure per-environment stub and backoff/retry for failed emails.
Test: Create template and trigger notification; confirm DB entry and email (stub) path.
T013 — Terms acceptances schema
Status: Completed, 008_terms_acceptances.sql.
Findings: Tracks versions and acceptances.
Risk: Version publication process not fully guarded — inadvertent reversion possible.
Recommendation: Add publish workflow and prevent deletion of published versions.
Test: Publish a new terms_version and assert that unaccepted users are flagged.
T014 — Commit migrations
Status: Completed.
Findings: All Phase 1 migration files committed.
Risk: Nested matex gitlink requires careful push order (matex then root).
Recommendation: Document deployment/push order and include CI that runs migrations check.
Test: CI runs DB migration validation and idempotency smoke.
T015 — GET /api/settings
Status: Completed (consolidated into T047).
Findings: In-memory caching with 3-min TTL implemented.
Risk: In-memory cache in serverless environments isn't reliable across instances.
Recommendation: Use a shared cache (Redis) for production or accept conservative TTL and fallbacks.
Test: Call GET twice, assert cached flag; simulate cache invalidation.
T016 — POST /api/settings (admin)
Status: Completed (consolidated into T047).
Findings: Atomic upsert and cache invalidation implemented.
Risk: Race conditions if multiple admins update concurrently.
Recommendation: Use DB transactions and optimistic locking; add audit logs (already present).
Test: Concurrent POSTs with overlapping keys — ensure deterministic end state.
T017 — Seed default settings
Status: Completed.
Findings: Seeder and scripts/seed-settings.js exist; dotenv used.
Risk: Seeder may overwrite production settings if misused.
Recommendation: Protect seeder with env guard and document usage.
Test: Run seeder in a test DB and verify expected keys exist.
T018 — Audit log table
Status: Completed, 009_audit_logs.sql.
Findings: Comprehensive audit schema and triggers across tables; 7-year retention.
Risk: Audit volume growth may impact DB size/performance.
Recommendation: Implement partitioning or archival strategy and monitor index sizes.
Test: Generate changes and query search_audit_logs() for expected diffs.
T019 — Authentication middleware
Status: Completed.
Findings: Middleware extracts Supabase session; role & KYC checks present.
Risk: Middleware performance and cookie handling across edge/CDN.
Recommendation: Ensure middleware minimal work and avoid heavy DB calls per request (cache user role).
Test: Access protected routes as anon/auth/admin and assert redirects/responses.
T020 — User registration/login pages
Status: Completed.
Findings: Onboarding flows, OAuth integration and role selection implemented.
Risk: Email verification and OAuth error flows must be hardened.
Recommendation: Add clear error handling for OAuth failures and replay attack protections.
Test: Test full signup/login flows including OAuth and email verification.
T021 — User profile management
Status: Completed.
Findings: Profile page supports uploads, KYC status; uses RLS.
Risk: Large file uploads and storage permission leakage.
Recommendation: Validate and sanitize file metadata, set signed URL TTLs, and scan for file size limits.
Test: Upload various file types and assert metadata stored and signed URLs expire.
T022 — Dashboard layout
Status: Completed.
Findings: Dashboard with role-based menu and terms modal.
Risk: Data shown may leak privileged info if role checks inconsistent.
Recommendation: Ensure server-side data gating and pagination for heavy queries.
Test: Render for buyer/seller/admin and confirm visible items differ correctly.
T023 — Listings management interface
Status: Completed.
Findings: Browse/manage, filters, role enforcement implemented.
Risk: Search/filter performance for large datasets.
Recommendation: Ensure server-side pagination + DB indexes for filterable columns (already present).
Test: Load with thousands of listings and run common filter combos; measure latency.
T024 — Listing creation form
Status: Completed.
Findings: Multi-step form, image uploads, draft/publish workflow.
Risk: Client-side validation mismatches DB constraints.
Recommendation: Mirror server-side Zod schemas client-side; perform server validation on submit.
Test: Submit edge values (zero qty, negative price) to ensure rejections.
T025 — Individual listing detail page
Status: Completed.
Findings: 3-column layout, gallery, inspection slots, buy/bid actions.
Risk: Data fetching for heavy listing pages must be optimized (SSR/ISR).
Recommendation: Use incremental rendering and cache expensive relationships (seller card).
Test: Load listing with many images and bids; assert acceptable render times.
T026 — Search & FTS
Status: Completed, migration 010_full_text_search.sql.
Findings: Weighted tsvector, GIN indexes, API endpoints with highlighting.
Risk: FTS ranking tuning and stopwords/locale handling.
Recommendation: Add language config, test multi-word queries and ranking thresholds; monitor index bloat.
Test: Search for sample terms, verify highlights and ranking.
T027 — Auction helpers
Status: Completed, src/lib/auction-helpers.ts.
Findings: computeAuctionState, minNextBid logic and soft close support included.
Risk: Edge rounding/currency handling could allow invalid bids.
Recommendation: Centralize money math in integer cents and unit-test boundary cases.
Test: Unit tests for minNextBid with percent vs fixed strategies and rounding.
T028 — POST /api/auctions/[id]/bid
Status: Completed.
Findings: Validations (auth, KYC, deposit placeholder), soft-close extension, transactions used.
Risk: Concurrency and deposit placeholder may allow unauthorized bids before deposit implemented.
Recommendation: Gate bidding with deposit check (T035) fully integrated; add idempotency tokens.
Test: Simulate concurrent bids and soft-close edge to ensure correct end time extensions.
Realtime bidding (f)
Status: Completed.
Findings: Realtime subscriptions and optimistic UI implemented.
Risk: Subscription scaling in Supabase channels and client reconnection logic.
Recommendation: Monitor channels limit and backoff reconnect; paginate bid history.
Test: Simulate many clients subscribing to same auction and measure behavior.
T030 — Outbid notifications (merged into T043)
Status: Completed (merged).
Findings: Notification triggers implemented; templates created.
Risk: Notification duplication or over-notifying on retries.
Recommendation: De-dup idempotency token per event and respect user preferences (T045).
Test: Place higher bid and assert previous bidder receives single outbid notification.
T031 — Manage inspection slots (seller)
Status: Completed.
Findings: Slot CRUD, buffer overlap validation, capacity rules.
Risk: Overlap check correctness for edge-case buffers.
Recommendation: Add time-range unit tests and consider timezone normalization in queries.
Test: Create overlapping slots with buffer and assert rejection.
T032 — Book/cancel inspection (buyer)
Status: Completed.
Findings: Booking APIs, duplicate prevention, notifications.
Risk: Race for last capacity seat.
Recommendation: Use DB transactions and SELECT ... FOR UPDATE for capacity checks.
Test: Concurrent bookings to the last slot verify capacity correctness.
T033 — Inspection reminders
Status: Completed.
Findings: Reminder batch processor and manual trigger.
Risk: Cron duplication and double sends.
Recommendation: Mark reminder_sent_at atomically and use idempotent operations.
Test: Run processInspectionReminders() twice for same window and assert single send.
T034 — Stripe client setup
Status: Completed.
Findings: src/lib/stripe.ts, test-mode indicator and env validation added.
Risk: Wrong environment keys in production leading to live charges.
Recommendation: Add environment gate to prevent live key usage in dev; validate key prefix.
Test: Ensure STRIPE_SECRET_KEY prefix test/live matches expected behavior.
T035 — Authorize deposit
Status: Completed.
Findings: Auction_deposits table and PaymentIntent (manual capture) created.
Risk: Manual capture flow needs robust reconciliation for expired authorizations.
Recommendation: Add expiry logic for authorizations and reconcile job to cancel stale PaymentIntents.
Test: Authorize deposit and simulate auction end; confirm capture flow works.
T036 — Release/refund deposits
Status: Completed.
Findings: Capture/cancel APIs and auction processing route.
Risk: Retry semantics with Stripe failures — idempotency & partial failures.
Recommendation: Use Stripe idempotency keys, implement retry with circuit breaker and audit logs.
Test: Simulate capture failures and ensure retry/alert behavior.
T037 — Deposit status UI
Status: Completed.
Findings: Deposit badges, bidding gate, integrated components and docs.
Risk: Sync between UI and PaymentIntent state.
Recommendation: Poll or websocket updates for deposit state; show clear error messages.
Test: Authorize deposit and confirm UI badge updates in real-time.
T038 — Fixed price checkout
Status: Completed.
Findings: Checkout session creation, pending order creation, success/cancel pages.
Risk: Race where listing becomes unavailable between session creation and payment.
Recommendation: Reserve listing briefly or re-validate at webhook; ensure order idempotency.
Test: Create checkout session, complete webhook, assert order status becomes paid.
T039 — Auction invoices
Status: Completed.
Findings: Invoice generation with deposit credit.
Risk: Invoice duplication or mismatch with deposit credits.
Recommendation: Use DB transaction to apply deposit credit and create invoice atomically.
Test: Generate invoice for winner and ensure deposit reduces final amount.
T040 — Stripe webhooks
Status: Completed.
Findings: Webhook handler with signature verification and event handling.
Risk: Replay or signature mismatch; large webhook storms.
Recommendation: Ensure signature secrets stored securely, idempotent handlers, and queue processing for heavy jobs.
Test: Post signed webhook events and verify idempotent processing.
T041 — Payout delay & fees
Status: Completed.
Findings: Payout calculations and payout_eligible_at introduced.
Risk: Math rounding and fee ordering errors causing miscalculated payouts.
Recommendation: Use cents-integer math and thorough unit tests for payout calculations.
Test: Verify payout amounts for sample orders with fees and processing fees applied.
T042 — Bell dropdown UI
Status: Completed.
Findings: Bell component, last 10 notifications dropdown and full notifications page.
Risk: Real-time unread counters inconsistent across tabs/devices.
Recommendation: Use real-time presence or subscribe to notifications updates; update unread counts atomically.
Test: Trigger notifications and verify bell counter increments and dropdown contents.
T043 — Notification triggers
Status: Completed.
Findings: Centralized triggers and templates; T030/T042 merged here.
Risk: Trigger ordering and async failures causing missed notifications.
Recommendation: Use background job queue and confirm delivery, with retry and dead-letter handling.
Test: Fire each trigger and assert DB template usage and channels honored.
T044 — Email renderer (merged into T051)
Status: Completed (merged).
Findings: Handlebars-like templates, markdown→HTML, stub provider.
Risk: Email rendering differences across clients, XSS in variable substitution.
Recommendation: Strict HTML escaping and email client testing (Litmus/Inbox).
Test: Generate preview with complex variables, verify safe HTML and plaintext fallback.
T045 — User preferences
Status: Completed.
Findings: User prefs table and settings page; per-type and channel toggles.
Risk: Preference checks must be enforced before sending notifications.
Recommendation: Add server-side preference check in createNotificationFromTemplate() path.
Test: Set preferences to disable email and trigger event; confirm only in-app notification created.
T046 — Admin route guard
Status: Completed.
Findings: Server-side admin verification and admin layout.
Risk: Stale role info in cache causing unauthorized access.
Recommendation: Validate role per request or short-lived cache; audit unauthorized attempt logs.
Test: Attempt admin routes as non-admin and admin; verify behavior.
T047 — Settings editor UI
Status: Completed.
Findings: JSON editor, admin settings page, caching and atomic updates.
Risk: Editing JSON directly could introduce invalid shapes that break runtime.
Recommendation: Strong Zod schema validation server-side and preview/validation on save.
Test: Attempt to save malformed JSON and ensure server rejects with helpful errors.
T048 — KYC manager
Status: Completed.
Findings: KYC admin UI, docs, doc preview placeholder, audit log integration.
Risk: Sensitive document exposure and retention policy.
Recommendation: Secure access to document storage with signed URLs and restrict preview sizes.
Test: Approve/reject flows and verify kyc_audit_log entries and notifications.
T049 — Listings moderation
Status: Completed.
Findings: Admin listings API with bulk ops and filtering.
Risk: Bulk operations may cause long transactions and lock contention.
Recommendation: Chunk bulk ops and provide async background processing for heavy sets.
Test: Bulk update 10k listings and validate responsiveness and audit logs.
T050 — Payments & deposits (admin)
Status: Completed.
Findings: Admin payments UI, refund processing, audit logging.
Risk: Refunds need idempotency and correct partial refund handling.
Recommendation: Use Stripe idempotency keys and verify DB/Stripe states remain consistent.
Test: Process partial/full refunds and verify DB + Stripe reconciliation.
T051 — Notification templates CMS
Status: Completed.
Findings: Full CRUD, previews, versioning, merged T044.
Risk: Template rollback could break variables expected by triggers.
Recommendation: Template variable docs and preview test harness per template; prevent deleting templates in use.
Test: Preview template with sample variables and run version rollback.
T052 — Legal CMS (Terms/Privacy)
Status: Completed.
Findings: Markdown editor, publishing workflow, user acceptance tracking and enforcement.
Risk: Force re-accept flows could block users unexpectedly.
Recommendation: Stagger enforcement and notify users before forcing re-acceptance; test legal workflows.
Test: Publish new version and confirm users are prompted and acceptance recorded.
T053 — Audit log viewer
Status: Completed.
Findings: Audit UI and API with filters and full-text search.
Risk: Large result sets and sensitive data exposure.
Recommendation: Strict admin RLS and result redaction for PII; pagination and export limits.
Test: Search logs and open JSON diffs; confirm redaction works for PII fields.
T054 — Brand theme & favicon
Status: Completed.
Findings: Tailwind theme variables, favicon, brand docs.
Risk: Inconsistent branding across components library.
Recommendation: Centralize Tailwind theme tokens and export a design token file; add visual regression tests.
Test: Verify theme variables applied across top-level components.
T055 — Landing hero + CTA
Status: Completed.
Findings: Landing hero and CTA built with responsive behavior.
Risk: Accessibility and conversion metrics not captured.
Recommendation: Add A11y checks (axe) and add analytics events for CTA clicks.
Test: Run Lighthouse + axe and verify CTA click tracking fires.
T056 — Browse filters & URL state
Status: Completed.
Findings: Filters sync to URL, SSR support, docs present.
Risk: URL param canonicalization causing duplicate pages/SEO issues.
Recommendation: Canonicalize search pages and debounce filter updates.
Test: Change filters, refresh & confirm SSR shows identical results.
T057 — Error/empty states
Status: Completed.
Findings: 404/500 pages and empty states components created.
Risk: Error pages exposing stack traces in prod.
Recommendation: Ensure Sentry/logging integration and sanitized error views.
Test: Force 500 and verify user-friendly page shown and error captured in logs.
T058 — Loading & skeletons
Status: Completed.
Findings: Skeleton components and spinners added.
Risk: Overuse of skeletons may mask slow queries.
Recommendation: Use skeletons only for perceivable speed-ups and add loading time metrics.
Test: Check skeleton appear/disappear timing across slow networks.
T059 — Price trend charts
Status: Completed, migration 019_price_trends.sql.
Findings: Aggregation pipeline, API and chart components.
Risk: Large aggregation queries may be heavy.
Recommendation: Pre-aggregate with material-weekly summary and cache results.
Test: Run analytic aggregation for a large time range and measure latency.
T060 — Trading volume tiles
Status: Completed, migration 020_analytics_dashboard.sql.
Findings: KPI tiles and caching.
Risk: Stale metrics without refresh policy.
Recommendation: Implement scheduled aggregation and cache invalidation.
Test: Generate sample data and verify tiles match expected aggregated values.
T061 — Seller reputation score
Status: Completed, migration 021_seller_reputation.sql.
Findings: Scoring model based on fulfillment/cancellations.
Risk: Score manipulation via edge cases.
Recommendation: Cap influence of any single metric and add dispute resolution workflow.
Test: Recompute scores after introducing disputed orders and verify resilience.
T062 — Export reports CSV
Status: Completed.
Findings: Admin export endpoints with streamed CSV output.
Risk: Large exports might OOM or time out.
Recommendation: Stream results and offer scheduled export for huge ranges; enforce quotas.
Test: Export a large dataset and verify streaming and file correctness.
T063 — Legal pages (Terms/Privacy/Refund)
Status: Completed, T063_LEGAL_PAGES.md.
Findings: Markdown pages present and linked; publishing integrated with T052.
Risk: Legal content correctness must be reviewed by counsel.
Recommendation: Mark legal content as legal review required and prevent publishing without approval.
Test: Navigate public legal routes and confirm expected content and SEO.
T064 — Consent gating before bid
Status: Completed.
Findings: Enforces latest terms_version before POST /bid or POST /deposit; modal & recording implemented.
Risk: Gate may block legitimate background operations or automated flows.
Recommendation: Allow service/backoffice API keys to bypass gating and ensure UI prompts do not block safe admin workflows.
Test: Attempt to place a bid as unaccepted user and assert modal appears and acceptance recorded before retry.