-# MATEX-MAIN-DEV

Overview:
- Single linear task list derived from `matex_full_task_list.csv`.
- Follow `project_rules.md`: one task at a time, document changes, use branches per task.
- Use Supabase for DB, Next.js 14 + TypeScript for App Router, TailwindCSS for styling.

Rules (summary from `project_rules.md`):
- No hallucinations: only use the stack defined in `project_rules.md`.
- One task at a time: strictly follow the CSV order.
- Documentation first: for each task, list files changed, DB changes, API endpoints, and tests.

References:
- Source task list: `matex_full_task_list.csv`
- Rules: `project_rules.md`

---

Phase: 0 — Pre-flight

task code: T001
task type: Pre-flight
description: Bootstrap repo — Create a Next.js 14 (App Router) + TypeScript project named 'matex'. Add TailwindCSS. Initialize git with MIT license and basic README.
tools: Node.js, npm, Next.js 14, TypeScript, TailwindCSS
references: matex_full_task_list.csv (T001), project_rules.md
status: todo
start date:
end date:

task code: T002
task type: Pre-flight
description: VS Code workspace & settings — add .vscode/extensions.json recommending Copilot, ESLint, Prettier, Tailwind CSS IntelliSense, EditorConfig, dotenv. Add .vscode/settings.json to format on save with Prettier and tailwind class sorting.
tools: VS Code, Prettier, ESLint, Tailwind CSS Intellisense
references: matex_full_task_list.csv (T002), project_rules.md
status: todo
start date:
end date:

task code: T003
task type: Pre-flight
description: EditorConfig + Prettier — create .editorconfig and .prettierrc enforcing 2 spaces, LF, single quotes.
tools: EditorConfig, Prettier
references: matex_full_task_list.csv (T003), project_rules.md
status: todo
start date:
end date:

task code: T004
task type: Pre-flight
description: Env templates — add .env.example with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
tools: text editor
references: matex_full_task_list.csv (T004), project_rules.md
status: todo
start date:
end date:

Phase: 1 — Supabase

task code: T005
task type: Supabase
description: Supabase client helpers — create lib/supabaseServer.ts and lib/supabaseClient.ts using @supabase/supabase-js for server (service role) and client (anon key).
tools: @supabase/supabase-js, TypeScript
references: matex_full_task_list.csv (T005), project_rules.md
status: todo
start date:
end date:

task code: T006
task type: Supabase/DB
description: Profiles + RBAC schema — SQL migration for profiles table and RLS (users read/update own; admins all).
tools: psql/Supabase migrations, SQL
references: matex_full_task_list.csv (T006), project_rules.md
status: todo
start date:
end date:

task code: T007
task type: Supabase/DB
description: Listings + Images schema — create listings and listing_images tables and RLS policies.
tools: SQL migrations, Supabase Storage
references: matex_full_task_list.csv (T007), project_rules.md
status: todo
start date:
end date:

task code: T008
task type: Supabase/DB
description: Auctions & Bids schema — create auctions and bids tables with appropriate indexes.
tools: SQL migrations
references: matex_full_task_list.csv (T008), project_rules.md
status: todo
start date:
end date:

task code: T009
task type: Supabase/DB
description: Orders schema — create orders table with stripe_payment_intent and status tracking.
tools: SQL migrations
references: matex_full_task_list.csv (T009), project_rules.md
status: todo
start date:
end date:

task code: T010
task type: Supabase/DB
description: Inspections schema — create inspections and inspection_bookings tables.
tools: SQL migrations
references: matex_full_task_list.csv (T010), project_rules.md
status: todo
start date:
end date:

task code: T011
task type: Supabase/DB
description: App settings schema — add app_settings and kyc_fields tables.
tools: SQL migrations
references: matex_full_task_list.csv (T011), project_rules.md
status: todo
start date:
end date:

task code: T012
task type: Supabase/DB
description: Notifications schema — create notification_templates and notifications tables.
tools: SQL migrations
references: matex_full_task_list.csv (T012), project_rules.md
status: todo
start date:
end date:

task code: T013
task type: Supabase/DB (Legal)
description: Terms acceptances — create terms_acceptances table to record user acceptance of T&C.
tools: SQL migrations
references: matex_full_task_list.csv (T013), project_rules.md
status: todo
start date:
end date:

task code: T014
task type: Supabase/DB
description: Commit migrations — export SQL migration files and commit to repo; ensure idempotency.
tools: migration tool (pgm, supabase), git
references: matex_full_task_list.csv (T014), project_rules.md
status: todo
start date:
end date:

Phase: 2 — Settings

task code: T015
task type: API/Settings
description: GET /api/settings — implement `app/api/settings/route.ts` supporting `?keys=` and a 3-minute in-memory cache server-side.
tools: Next.js App Router API routes, Supabase server client, TypeScript
references: matex_full_task_list.csv (T015), project_rules.md, docs/SETTINGS_KEYS.md
status: todo
start date:
end date:

task code: T016
task type: API/Settings (Admin)
description: POST /api/settings (admin) — upsert multiple settings atomically and invalidate cache.
tools: Next.js API, Supabase, server auth
references: matex_full_task_list.csv (T016), project_rules.md
status: todo
start date:
end date:

task code: T017
task type: Chore/Seed
description: Seed default settings — seed auction and notification defaults into `app_settings`.
tools: seed scripts, Supabase admin client
references: matex_full_task_list.csv (T017), project_rules.md
status: todo
start date:
end date:

task code: T018
task type: DB/Audit
description: Audit log table — add `audit_log` table and helper for logging changes.
tools: SQL migrations, helper lib for audit writes
references: matex_full_task_list.csv (T018), project_rules.md
status: todo
start date:
end date:

Phase: 3 — Auth & KYC

task code: T019
task type: Auth
description: Auth wiring (server/client) — create Supabase auth context/hooks and server-side helpers.
tools: Supabase Auth, Next.js server components, TypeScript
references: matex_full_task_list.csv (T019), project_rules.md
status: todo
start date:
end date:

task code: T020
task type: Auth/KYC UI
description: Dynamic onboarding (Buyer/Seller) — render dynamic KYC fields from DB and support file uploads.
tools: React forms, Zod, Supabase Storage
references: matex_full_task_list.csv (T020), project_rules.md
status: todo
start date:
end date:

task code: T021
task type: KYC
description: KYC upload & review status — implement document upload, metadata, and status page.
tools: Supabase Storage, server APIs
references: matex_full_task_list.csv (T021), project_rules.md
status: todo
start date:
end date:

task code: T022
task type: Legal/Auth
description: Terms consent gate — require T&C consent on signup and before bidding; store acceptance.
tools: UI modal, DB `terms_acceptances`, middleware
references: matex_full_task_list.csv (T022), project_rules.md
status: todo
start date:
end date:

Phase: 4 — Listings

task code: T023
task type: UI/Listing
description: Create listing UI — `/sell/new` with image uploads to Supabase Storage.
tools: React forms, Supabase Storage, Zod
references: matex_full_task_list.csv (T023), project_rules.md
status: todo
start date:
end date:

task code: T024
task type: UI/Browse
description: Browse listings page — `/browse` with filters and SSR pagination.
tools: Next.js server components, pagination, filtering
references: matex_full_task_list.csv (T024), project_rules.md
status: todo
start date:
end date:

task code: T025
task type: UI/Listing Detail
description: Listing detail page — gallery, specs, inspection slots, pricing area.
tools: React components, Supabase queries
references: matex_full_task_list.csv (T025), project_rules.md
status: todo
start date:
end date:

task code: T026
task type: DB/Search
description: Search & FTS — add Postgres full-text search and search UI.
tools: Postgres FTS, Next.js, server-side indexing
references: matex_full_task_list.csv (T026), project_rules.md
status: todo
start date:
end date:

Phase: 5 — Auctions

task code: T027
task type: Domain/Helpers
description: Auction helpers — compute isActive, timeLeft, currentHighBid, minNextBid using settings.
tools: TypeScript helpers, Zod for schemas
references: matex_full_task_list.csv (T027), project_rules.md
status: todo
start date:
end date:

task code: T028
task type: API/Auction
description: POST /api/auctions/[id]/bid — validate auction active, deposit authorized, amount >= minNextBid; extend soft-close if needed.
tools: Next.js API route, Supabase transactions, Zod
references: matex_full_task_list.csv (T028), project_rules.md
status: todo
start date:
end date:

task code: T029
task type: Realtime
description: Realtime bids subscription — use Supabase Realtime to stream bids and update UI.
tools: Supabase Realtime, client subscriptions
references: matex_full_task_list.csv (T029), project_rules.md
status: todo
start date:
end date:

task code: T030
task type: Notifications
description: Outbid notifications — notify previous highest bidder via in-app/email when outbid.
tools: notifications subsystem, Nodemailer stub
references: matex_full_task_list.csv (T030), project_rules.md
status: todo
start date:
end date:

Phase: 6 — Inspections

task code: T031
task type: UI/Inspections
description: Manage inspection slots (seller) — seller can add/remove slots with capacity and buffer validation.
tools: server actions, DB migrations
references: matex_full_task_list.csv (T031), project_rules.md
status: todo
start date:
end date:

task code: T032
task type: Booking
description: Book/cancel inspection (buyer) — booking logic, capacity checks, notifications.
tools: Supabase transactions, UI
references: matex_full_task_list.csv (T032), project_rules.md
status: todo
start date:
end date:

task code: T033
task type: Notifications/Scheduler
description: Inspection reminders — send reminders before slots via in-app/email (configurable in settings).
tools: scheduler/cron, notifications system
references: matex_full_task_list.csv (T033), project_rules.md
status: todo
start date:
end date:

Phase: 7 — Deposits

task code: T034
task type: Payments/Stripe
description: Stripe client setup — create lib/stripe.ts and load keys from ENV; show test mode on UI.
tools: Stripe SDK, ENV variables
references: matex_full_task_list.csv (T034), project_rules.md
status: todo
start date:
end date:

task code: T035
task type: API/Deposits
description: Authorize deposit — POST /api/deposits/authorize to create PaymentIntent and link to user+auction.
tools: Stripe PaymentIntent, server APIs
references: matex_full_task_list.csv (T035), project_rules.md
status: todo
start date:
end date:

task code: T036
task type: Payments/Release
description: Release/refund deposits — capture winner deposit, refund others; scheduled job or server action.
tools: Stripe API, server jobs
references: matex_full_task_list.csv (T036), project_rules.md
status: todo
start date:
end date:

task code: T037
task type: UI/Deposits
description: Deposit status UI — show deposit status in auction page with badges and CTA.
tools: React components, Supabase queries
references: matex_full_task_list.csv (T037), project_rules.md
status: todo
start date:
end date:

Phase: 8 — Payments

task code: T038
task type: Checkout
description: Fixed price checkout — Stripe Checkout for fixed listings, create pending order and success/cancel pages.
tools: Stripe Checkout, server API, Next.js pages
references: matex_full_task_list.csv (T038), project_rules.md
status: todo
start date:
end date:

task code: T039
task type: Invoicing
description: Auction winner invoice — on auction close, create order, deduct deposit, create PaymentIntent for remaining balance.
tools: server jobs, Stripe, orders DB
references: matex_full_task_list.csv (T039), project_rules.md
status: todo
start date:
end date:

task code: T040
task type: Webhooks
description: Stripe webhooks — implement webhook handler and verify signature to update orders.
tools: Stripe webhooks, Next.js API, secret in ENV
references: matex_full_task_list.csv (T040), project_rules.md
status: todo
start date:
end date:

task code: T041
task type: Payments/Admin
description: Payout delay & fees — apply platform fees and payout delay from settings; reflect in order summary.
tools: DB calculations, admin settings
references: matex_full_task_list.csv (T041), project_rules.md
status: todo
start date:
end date:

Phase: 9 — Notifications

task code: T042
task type: UI/Notifications
description: Bell dropdown UI — navbar bell with unread count and dropdown; notifications page and mark-as-read.
tools: React components, Supabase queries
references: matex_full_task_list.csv (T042), project_rules.md
status: todo
start date:
end date:

task code: T043
task type: Triggers
description: Notification triggers — helpers to insert notifications on events (new bid, outbid, auction won, inspection booked, deposit authorized).
tools: server helpers, DB inserts
references: matex_full_task_list.csv (T043), project_rules.md
status: todo
start date:
end date:

task code: T044
task type: Email
description: Email renderer — render email templates from DB, compile markdown with templating, send via nodemailer stub.
tools: Nodemailer (stub), markdown renderer, template engine
references: matex_full_task_list.csv (T044), project_rules.md
status: todo
start date:
end date:

task code: T045
task type: Preferences
description: User preferences — notification preferences page to toggle channels and digest frequency.
tools: UI forms, DB storage
references: matex_full_task_list.csv (T045), project_rules.md
status: todo
start date:
end date:

Phase: 10 — Admin

task code: T046
task type: Admin
description: Admin route guard — protect /admin routes, require profiles.role='admin'.
tools: middleware, auth checks
references: matex_full_task_list.csv (T046), project_rules.md
status: todo
start date:
end date:

task code: T047
task type: Admin/Settings
description: Settings editor UI — CRUD editor for auction, fees, legal, inspection, notifications with validation and cache bust.
tools: JSON editor, server APIs, validation (Zod)
references: matex_full_task_list.csv (T047), project_rules.md
status: todo
start date:
end date:

task code: T048
task type: Admin/KYC
description: KYC manager — approve/reject KYC with notes and notify users; preview documents.
tools: admin UI, storage preview
references: matex_full_task_list.csv (T048), project_rules.md
status: todo
start date:
end date:

task code: T049
task type: Admin/Moderation
description: Listings moderation — moderation UI, bulk operations, inspections overview.
tools: admin UI, DB queries
references: matex_full_task_list.csv (T049), project_rules.md
status: todo
start date:
end date:

task code: T050
task type: Admin/Payments
description: Payments & deposits dashboard — show authorized/captured/refunded deposits and orders; manual refund with audit.
tools: admin UI, Stripe APIs
references: matex_full_task_list.csv (T050), project_rules.md
status: todo
start date:
end date:

task code: T051
task type: Admin/Templates
description: Notification templates CMS — CRUD for templates with preview and variable docs.
tools: admin UI, markdown editor
references: matex_full_task_list.csv (T051), project_rules.md
status: todo
start date:
end date:

task code: T052
task type: Admin/Legal
description: Legal CMS (Terms/Privacy) — editable markdown for Terms & Privacy; publish version to app_settings and force re-accept on change.
tools: markdown editor, DB app_settings
references: matex_full_task_list.csv (T052), project_rules.md
status: todo
start date:
end date:

task code: T053
task type: Admin/Audit
description: Audit log viewer — add viewer with filters by actor, action and date range.
tools: admin UI, DB queries
references: matex_full_task_list.csv (T053), project_rules.md
status: todo
start date:
end date:

Phase: 11 — UX & Identity

task code: T054
task type: UI/Brand
description: Brand theme & favicon — apply Tailwind brand variables, load Inter, add favicon and navbar logo.
tools: TailwindCSS, font loading, image assets
references: matex_full_task_list.csv (T054), project_rules.md, docs/LOGO.md
status: todo
start date:
end date:

task code: T055
task type: UI/Landing
description: Landing hero + CTA — hero section with CTA and 3-step how-it-works.
tools: React, Tailwind
references: matex_full_task_list.csv (T055), project_rules.md
status: todo
start date:
end date:

task code: T056
task type: UI/Filters
description: Browse filters & URL state — filters synced to URLSearchParams with SSR results.
tools: URLSearchParams, server-side rendering
references: matex_full_task_list.csv (T056), project_rules.md
status: todo
start date:
end date:

task code: T057
task type: UI/States
description: Error/empty states — add 404/500 pages and empty-state components.
tools: React components, error handling
references: matex_full_task_list.csv (T057), project_rules.md
status: todo
start date:
end date:

task code: T058
task type: UI/Loading
description: Loading & skeletons — skeleton loaders and spinners for cards/tables.
tools: CSS animations, components
references: matex_full_task_list.csv (T058), project_rules.md
status: todo
start date:
end date:

Phase: 12 — Data & Analytics

task code: T059
task type: Analytics
description: Price trend charts — aggregate historical winning bids by material and render line charts client-side.
tools: DB aggregation, chart library (e.g., Chart.js, Recharts)
references: matex_full_task_list.csv (T059), project_rules.md
status: todo
start date:
end date:

task code: T060
task type: Analytics
description: Trading volume tiles — dashboard KPIs: active auctions, weekly volume, new sellers, returning buyers.
tools: server aggregation, caching
references: matex_full_task_list.csv (T060), project_rules.md
status: todo
start date:
end date:

task code: T061
task type: Analytics
description: Seller reputation score — compute score from fulfilment metrics and show badge on profile.
tools: background jobs, DB queries
references: matex_full_task_list.csv (T061), project_rules.md
status: todo
start date:
end date:

task code: T062
task type: Reporting
description: Export reports CSV — admin can export price/volume reports as streamed CSV responses.
tools: server streams, CSV writer
references: matex_full_task_list.csv (T062), project_rules.md
status: todo
start date:
end date:

Phase: 13 — Legal & Compliance

task code: T063
task type: Legal
description: Legal pages (Terms/Privacy/Refund) — add markdown pages and link in footer.
tools: markdown pages, routing
references: matex_full_task_list.csv (T063), project_rules.md
status: todo
start date:
end date:

task code: T064
task type: Legal/Enforcement
description: Consent gating before bid — enforce latest terms acceptance before POST /bid or /deposit.
tools: middleware, DB checks
references: matex_full_task_list.csv (T064), project_rules.md
status: todo
start date:
end date:

task code: T065
task type: Legal/Policy
description: Privacy & data retention — document retention policy for bids, orders and KYC documents.
tools: docs, admin settings
references: matex_full_task_list.csv (T065), project_rules.md
status: todo
start date:
end date:

task code: T066
task type: Legal/UX
description: Cookie banner — add consent banner with analytics toggle and store choice.
tools: client UI, cookie/localStorage
references: matex_full_task_list.csv (T066), project_rules.md
status: todo
start date:
end date:

Phase: 14 — QA/Security/Perf

task code: T067
task type: Security
description: Rate limits for APIs — add per-IP rate limiter for write endpoints (bid, deposit, checkout, settings).
tools: in-memory or Upstash rate limiter, middleware
references: matex_full_task_list.csv (T067), project_rules.md
status: todo
start date:
end date:

task code: T068
task type: Validation
description: Zod validation — add Zod schemas for listing, bid, inspection, settings and return typed errors.
tools: Zod, TypeScript
references: matex_full_task_list.csv (T068), project_rules.md
status: todo
start date:
end date:

task code: T069
task type: Security/RLS
description: RLS policy review — audit all RLS to ensure least privilege and PII protection.
tools: DB audit scripts, policies review
references: matex_full_task_list.csv (T069), project_rules.md
status: todo
start date:
end date:

task code: T070
task type: Accessibility
description: Accessibility pass — improve ARIA, contrast, keyboard navigation and add skip-to-content link.
tools: accessibility audits, Lighthouse, components
references: matex_full_task_list.csv (T070), project_rules.md
status: todo
start date:
end date:

task code: T071
task type: QA
description: Manual E2E checklist — write a manual E2E flow for signup through fulfilment for testing.
tools: docs, checklist
references: matex_full_task_list.csv (T071), project_rules.md
status: todo
start date:
end date:

Phase: 15 — Deployment

task code: T072
task type: Ops/Vercel
description: Vercel config — add vercel.json and map environment variables for production.
tools: Vercel config, environment mapping
references: matex_full_task_list.csv (T072), project_rules.md
status: todo
start date:
end date:

task code: T073
task type: Ops/Supabase
description: Supabase production setup — connect to production Supabase and run migrations; verify RLS and storage buckets.
tools: Supabase dashboard, migrations
references: matex_full_task_list.csv (T073), project_rules.md
status: todo
start date:
end date:

task code: T074
task type: Ops/Stripe
description: Stripe webhooks (prod) — configure Stripe webhooks in production and test payment events end-to-end.
tools: Stripe dashboard, webhook registration
references: matex_full_task_list.csv (T074), project_rules.md
status: todo
start date:
end date:

task code: T075
task type: Ops/Domain
description: Custom domain & SSL — configure DNS, force HTTPS, add security headers (HSTS).
tools: DNS provider, hosting (Vercel)
references: matex_full_task_list.csv (T075), project_rules.md
status: todo
start date:
end date:

task code: T076
task type: Release
description: Release tag v0.1.0 — create CHANGELOG entry and tag repo `v0.1.0`.
tools: git tag, changelog
references: matex_full_task_list.csv (T076), project_rules.md
status: todo
start date:
end date:

---

Notes:
- This file mirrors the CSV order and follows `project_rules.md` (one task at a time).
- I can update a task entry with `status`, `start date`, `end date`, and `test status` as you begin work on it.

---

If you'd like, I will: create a branch `chore/tasklist-md`, commit this file, and push it (follow Git Rules). I can also open a PR and set the first task `T001` as next actionable item and create `chore/init` branch to start scaffolding.

Updated: (update these fields as work proceeds)
