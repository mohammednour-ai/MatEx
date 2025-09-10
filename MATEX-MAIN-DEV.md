# MATEX MAIN DEV — Canonical Task List

IMPORTANT: This file is the authoritative source for tasks. Do NOT reference external files for task details. If anything is missing, Copilot must ask.

## Embedded Project Rules (short)

- Use only the approved stack: Next.js 14 (TypeScript), Supabase, Stripe, TailwindCSS + shadcn/ui, Zod, Nodemailer.
- One task at a time: follow T001..T076 order.
- Documentation first: for each task include Files changed, DB changes, API endpoints, Tests.
- Parameterise configuration via `app_settings` or `.env`.
- Use TypeScript & Zod for validation.
- After each task update `MATEX-MAIN-DEV-UPDATED.md` with changes, files, and tests.

---

## Tasks (canonical order)

### T001 — Bootstrap repo

Phase: Phase 0 â€” Pre-flight
Description: Create a Next.js 14 (App Router) + TypeScript project named 'matex'. Add TailwindCSS. Initialize git with MIT license and basic README.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T002 — VS Code workspace & settings

Phase: Phase 0 â€” Pre-flight
Description: Add .vscode/extensions.json recommending: GitHub Copilot, ESLint, Prettier, Tailwind CSS IntelliSense, EditorConfig, dotenv. Add .vscode/settings.json to format on save with Prettier and tailwind class sorting.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T003 — EditorConfig + Prettier

Phase: Phase 0 â€” Pre-flight
Description: Create .editorconfig and .prettierrc. Enforce 2 spaces, LF, single quotes, Prettier integration for TS/JS/MD/JSON.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T004 — Env templates

Phase: Phase 0 â€” Pre-flight
Description: Add .env.example with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T005 — Supabase client helpers

Phase: Phase 1 â€” Supabase
Description: Create lib/supabaseServer.ts and lib/supabaseClient.ts using @supabase/supabase-js for server (service role) and client (anon key).

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T006 — Profiles + RBAC schema

Phase: Phase 1 â€” Supabase
Description: SQL migration for profiles(id uuid pk refs auth.users, full_name, phone, role enum buyer|seller|both|admin, kyc_status enum, company_name, created_at). Enable RLS: users read/update own; admins all.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T007 — Listings + Images schema

Phase: Phase 1 â€” Supabase
Description: Create listings(id, seller_id, title, description, material, condition, quantity numeric, unit, pricing_type fixed|auction, price_cad, buy_now_cad, location_city, location_province, status, created_at) and listing_images(listing_id,url,sort_order). RLS: seller CRUD own; public read active.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T008 — Auctions & Bids schema

Phase: Phase 1 â€” Supabase
Description: Create auctions(listing_id unique, start_at, end_at, min_increment_cad, soft_close_seconds) and bids(auction_id, bidder_id, amount_cad, created_at). Indexes on auction_id, created_at.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T009 — Orders schema

Phase: Phase 1 â€” Supabase
Description: Create orders(listing_id, buyer_id, seller_id, type fixed|auction, total_cad, status pending|paid|cancelled|fulfilled, stripe_payment_intent, created_at). RLS buyer/seller/admin.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T010 — Inspections schema

Phase: Phase 1 â€” Supabase
Description: Create inspections(listing_id, slot_at timestamptz, capacity int) and inspection_bookings(inspection_id, user_id, status booked|attended|no_show|cancelled, booked_at).

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T011 — App settings schema

Phase: Phase 1 â€” Supabase
Description: Create app_settings(key text pk, value jsonb, updated_by, updated_at) and kyc_fields(role seller|buyer, name, label, type text|number|date|file|select, required, options jsonb, sort_order).

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T012 — Notifications schema

Phase: Phase 1 â€” Supabase
Description: Create notification_templates(code unique, channel inapp|email|sms, subject, body_md, is_active, updated_at) and notifications(user_id, type info|warning|success|error, title, message, link, is_read, created_at).

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T013 — Terms acceptances

Phase: Phase 1 â€” Supabase
Description: Create terms_acceptances(user_id, terms_version text, accepted_at). RLS: user reads own, admin all.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T014 — Commit migrations

Phase: Phase 1 â€” Supabase
Description: Export SQL migration files and commit to repo, ensuring idempotent scripts.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T015 — GET /api/settings

Phase: Phase 2 â€” Settings
Description: Implement /app/api/settings/route.ts: accept ?keys=a,b,c and return merged JSON from app_settings with 3-min in-memory cache; server-only with service role.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T016 — POST /api/settings (admin)

Phase: Phase 2 â€” Settings
Description: Upsert multiple settings keys atomically; invalidate cache; admin role required; return updated keys.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T017 — Seed default settings

Phase: Phase 2 â€” Settings
Description: Seed auction.soft_close_seconds=120, auction.min_increment_strategy='fixed', auction.min_increment_value=5, auction.deposit_required=true, auction.deposit_percent=0.1, fees.transaction_percent=0.04, notifications.channels=['inapp','email'].

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T018 — Audit log table

Phase: Phase 2 â€” Settings
Description: Create audit_log(id, actor_id, action, before jsonb, after jsonb, created_at). Write helper to log settings changes.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T019 — Auth wiring (server/client)

Phase: Phase 3 â€” Auth & KYC
Description: Create auth utilities to read session server-side and client-side; redirect unauthenticated users for protected routes.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T020 — Dynamic onboarding (Buyer/Seller)

Phase: Phase 3 â€” Auth & KYC
Description: Add /onboarding/{buyer|seller} reading kyc_fields from DB to render dynamic forms with validation and file upload to storage.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T021 — KYC upload & review status

Phase: Phase 3 â€” Auth & KYC
Description: Implement document upload (ID/business license), store metadata, show 'pending/approved/rejected' on profile.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T022 — Terms consent gate

Phase: Phase 3 â€” Auth & KYC
Description: Add modal to accept latest terms_version from app_settings; store record in terms_acceptances; block actions until accepted.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T023 — Create listing UI

Phase: Phase 4 â€” Listings
Description: Build /sell/new with title, material, qty, unit, pricing_type fixed|auction, price, location, images. Upload to Supabase Storage.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T024 — Browse listings page

Phase: Phase 4 â€” Listings
Description: Implement /browse with filters (material, price range, type, location). SSR data with pagination.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T025 — Listing detail page

Phase: Phase 4 â€” Listings
Description: Show gallery, specs, seller card, inspection slots, pricing area (buy now / bid).

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T026 — Search & FTS

Phase: Phase 4 â€” Listings
Description: Add Postgres FTS on title/description/material; implement search bar and highlight matches.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T027 — Auction helpers

Phase: Phase 5 â€” Auctions
Description: Compute isActive, timeLeft, currentHighBid, minNextBid (fixed or percent) from settings.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T028 — POST /api/auctions/[id]/bid

Phase: Phase 5 â€” Auctions
Description: Validate auction active, user deposit authorized, amount >= minNextBid. Insert bid. If remaining <= soft_close_seconds, extend end_at. Return new state.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T029 — Realtime bids subscription

Phase: Phase 5 â€” Auctions
Description: Subscribe to bids by auction_id; update current price and history live; optimistic UI on place bid.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T030 — Outbid notifications

Phase: Phase 5 â€” Auctions
Description: On new highest bid, notify previous highest bidder via in-app/email using notification_templates.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T031 — Manage inspection slots (seller)

Phase: Phase 6 â€” Inspections
Description: Seller can add/remove slots with capacity and buffers from settings; validate time overlaps.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T032 — Book/cancel inspection (buyer)

Phase: Phase 6 â€” Inspections
Description: Allow booking if capacity available; prevent duplicates; show upcoming visits; notify buyer & seller.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T033 — Inspection reminders

Phase: Phase 6 â€” Inspections
Description: Send reminders X hours before slot time (configurable in settings) via in-app/email.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T034 — Stripe client setup

Phase: Phase 7 â€” Deposits
Description: Create lib/stripe.ts; load keys from env; add test mode indicator on UI.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T035 — Authorize deposit

Phase: Phase 7 â€” Deposits
Description: Authorize deposit (percent or flat from settings) using PaymentIntent with capture later; link to user+auction; gate bidding.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T036 — Release/refund deposits

Phase: Phase 7 â€” Deposits
Description: On auction close, capture winner deposit (apply to invoice) and cancel others; implement cron/server action.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T037 — Deposit status UI

Phase: Phase 7 â€” Deposits
Description: Show 'Deposit required/authorized' badges and CTA to authorize deposit before bidding.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T038 — Fixed price checkout

Phase: Phase 8 â€” Payments
Description: Create /api/checkout/fixed to create Checkout Session; create pending order; success/cancel pages and status updates.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T039 — Auction winner invoice

Phase: Phase 8 â€” Payments
Description: When auction closes, create order with total = winning bid; deduct deposit; create remaining balance PaymentIntent.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T040 — Stripe webhooks

Phase: Phase 8 â€” Payments
Description: Add /api/stripe/webhook verifying signature; handle checkout.session.completed and payment_intent.succeeded; update orders.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T041 — Payout delay & fees

Phase: Phase 8 â€” Payments
Description: Apply fees.transaction_percent; set payout delay days from settings; reflect in order summary.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T042 — Bell dropdown UI

Phase: Phase 9 â€” Notifications
Description: Navbar bell with unread count; dropdown last 10; /notifications list with pagination; mark-as-read.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T043 — Notification triggers

Phase: Phase 9 â€” Notifications
Description: Server helpers to insert notifications on: new bid, outbid, auction won, inspection booked, deposit authorized.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T044 — Email renderer

Phase: Phase 9 â€” Notifications
Description: Compile body_md with simple templating (Handlebars-like); send via nodemailer (stub provider).

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T045 — User preferences

Phase: Phase 9 â€” Notifications
Description: Settings page to toggle channels (inapp/email/sms) and digest frequency; store in app_settings or per-user table.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T046 — Admin route guard

Phase: Phase 10 â€” Admin
Description: Protect /admin routes; only profiles.role='admin' can access; add layout with sidebar nav.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T047 — Settings editor UI

Phase: Phase 10 â€” Admin
Description: CRUD editor for auction, fees, legal, inspection, notifications; JSON editor with validation and save + cache bust.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T048 — KYC manager

Phase: Phase 10 â€” Admin
Description: Table of profiles with kyc_status; preview documents; approve/reject with reason; notify user; log audit.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T049 — Listings moderation

Phase: Phase 10 â€” Admin
Description: Search/filter listings; toggle status; view associated inspections; bulk operations.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T050 — Payments & deposits

Phase: Phase 10 â€” Admin
Description: Show authorized/captured/refunded deposits; order status; manual refund with confirmation and audit trail.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T051 — Notification templates CMS

Phase: Phase 10 â€” Admin
Description: CRUD for notification_templates with preview and variables docs; simple versioning.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T052 — Legal CMS (Terms/Privacy)

Phase: Phase 10 â€” Admin
Description: Editable markdown for Terms/Privacy; publish version to app_settings; force re-accept when version changes.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T053 — Audit log viewer

Phase: Phase 10 â€” Admin
Description: Add audit log viewer with filters by actor, action, date range.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T054 — Brand theme & favicon

Phase: Phase 11 â€” UX & Identity
Description: Set Tailwind theme variables for brand palette; load Inter; add favicon and navbar logo; dark/light modes optional.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T055 — Landing hero + CTA

Phase: Phase 11 â€” UX & Identity
Description: Build hero section with headline/subhead, Start Selling CTA, and 3-step how it works; responsive.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T056 — Browse filters & URL state

Phase: Phase 11 â€” UX & Identity
Description: Implement filters (material, price, type, location) synced to URLSearchParams; SSR results and pagination.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T057 — Error/empty states

Phase: Phase 11 â€” UX & Identity
Description: Add 404/500 pages; components for empty listings/bids/notifications; friendly copy.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T058 — Loading & skeletons

Phase: Phase 11 â€” UX & Identity
Description: Add skeleton components for cards, tables; use animated shimmer; integrate spinner.gif.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T059 — Price trend charts

Phase: Phase 12 â€” Data & Analytics
Description: Aggregate historical winning bids by material per week; expose API; render line chart client-side with caching.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T060 — Trading volume tiles

Phase: Phase 12 â€” Data & Analytics
Description: Dashboard KPIs: active auctions, weekly volume, new sellers, returning buyers; server actions + caching.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T061 — Seller reputation score

Phase: Phase 12 â€” Data & Analytics
Description: Compute simple score based on fulfilment time, disputes, cancellations; show badge on seller profile.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T062 — Export reports CSV

Phase: Phase 12 â€” Data & Analytics
Description: Admin can export price/volume reports as CSV; streamed response.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T063 — Legal pages (Terms/Privacy/Refund)

Phase: Phase 13 â€” Legal & Compliance
Description: Add markdown pages reflecting Auctioneers Act/Consumer Protection and PIPEDA; link in footer.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T064 — Consent gating before bid

Phase: Phase 13 â€” Legal & Compliance
Description: Require latest terms_version before POST /bid or /deposit; show modal to accept; record acceptance.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T065 — Privacy & data retention

Phase: Phase 13 â€” Legal & Compliance
Description: Add section to Privacy explaining retention of bids/orders/kyc docs; provide contact for data requests.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T066 — Cookie banner

Phase: Phase 13 â€” Legal & Compliance
Description: Implement cookie consent banner with minimal analytics toggle; store choice.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T067 — Rate limits for APIs

Phase: Phase 14 â€” QA/Security/Perf
Description: Add in-memory or Upstash-based rate limiter for write endpoints: bid, deposit, checkout, settings.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T068 — Zod validation

Phase: Phase 14 â€” QA/Security/Perf
Description: Introduce zod schemas for listing, bid, inspection, settings; return typed errors.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T069 — RLS policy review

Phase: Phase 14 â€” QA/Security/Perf
Description: Audit all RLS to ensure least privilege and PII protection; add tests/queries to verify.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T070 — Accessibility pass

Phase: Phase 14 â€” QA/Security/Perf
Description: Add aria labels, focus states, contrast fixes, keyboard navigation and skip-to-content link.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T071 — Manual E2E checklist

Phase: Phase 14 â€” QA/Security/Perf
Description: Write a checklist: signup -> KYC -> create listing -> add inspection -> deposit -> bid -> win -> invoice -> pay -> fulfilment.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T072 — Vercel config

Phase: Phase 15 â€” Deployment
Description: Add vercel.json, configure build output, and map environment variables for prod.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T073 — Supabase production setup

Phase: Phase 15 â€” Deployment
Description: Point to prod project; run migrations; verify RLS and storage buckets; set policies.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T074 — Stripe webhooks (prod)

Phase: Phase 15 â€” Deployment
Description: Set STRIPE_WEBHOOK_SECRET in prod; register webhook endpoints; test payment events E2E.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T075 — Custom domain & SSL

Phase: Phase 15 â€” Deployment
Description: Add domain DNS records; force HTTPS; redirect wwwâ†’root; add security headers (HSTS).

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### T076 — Release tag v0.1.0

Phase: Phase 15 â€” Deployment
Description: Create CHANGELOG.md with features and known limitations; create git tag v0.1.0 and push.

Files changed:
- (list files changed; update when implementing)

DB changes:
- (describe schema/migrations if any)

API endpoints:
- (list endpoints, method, request/response)

Tests:
- (unit/integration/manual checks)

Notes:
- (optional notes)

### Phase: 16 — Growth & Trust

This phase contains small, ~1 hour implementation tasks to increase buyer trust, seller productivity, and cross-cutting operations features. Each task is intentionally small and scoped for a single developer hour.

Below are concise entries for tasks T077 → T144 (see `matex_full_task_list.csv` for CSV rows).

* T077 — DB: escrow fields and indexes — Branch: feat/escrow-db — Add `escrow_status`, `escrow_amount_cad`, `escrow_release_at` to `orders` and index; acceptance: migration runs and columns exist.
* T078 — API: create escrow hold (authorize) — Branch: feat/api-escrow-authorize — POST /api/escrow/authorize to create escrow hold; acceptance: returns 200 and order shows `escrow_status=authorized`.
* T079 — UI: escrow badge + CTA on order page — Branch: feat/ui-order-escrow-badge — Add badge/details row on buyer order detail; acceptance: badge visible and reflects DB state.
* T080 — Worker: escrow release trigger (skeleton) — Branch: feat/escrow-worker — Scheduled worker stub reading `escrow_release_at`; acceptance: worker lists eligible orders on dry-run.
* T081 — DB: disputes table — Branch: feat/db-disputes — Create `disputes` table with evidence JSONB; acceptance: migration adds table.
* T082 — API: submit dispute + evidence upload — Branch: feat/api-dispute-create — POST /api/disputes to create dispute and store evidence metadata; acceptance: dispute stored and audit entry created.
* T083 — Admin: disputes queue UI — Branch: feat/admin-disputes-ui — Admin list & actions for disputes; acceptance: admin updates reflect in DB & audit_log.
* T084 — Notifications: dispute triggers — Branch: feat/notify-dispute — Add notification templates and triggers; acceptance: notification rows created.
* T085 — DB: saved_searches table — Branch: feat/db-saved-searches — Create `saved_searches` table; acceptance: migration created.
* T086 — API: saved-search CRUD — Branch: feat/api-saved-searches — CRUD endpoints for saved searches; acceptance: create & list work for user.
* T087 — UI: save-search button + manage panel — Branch: feat/ui-saved-search-btn — Add save button + modal in search UI; acceptance: creates saved_search via API.
* T088 — DB: price_watch table — Branch: feat/db-price-watch — Create `price_watch` table for alerts; acceptance: migration runs.
* T089 — Job: price-watch alert runner — Branch: feat/job-price-watch-alerts — Cron evaluating price_watch conditions; acceptance: job finds matches on dry-run.
* T090 — UI: watch toggle on listing — Branch: feat/ui-watch-toggle — Add watch icon to listing card; acceptance: toggling updates DB & shows toast.
* T091 — API: seller reputation detail endpoint — Branch: feat/api-seller-reputation — GET /api/sellers/:id/reputation; acceptance: returns JSON summary.
* T092 — UI: reputation deep-view page — Branch: feat/ui-seller-reputation — Seller reputation page; acceptance: page loads and shows values.
* T093 — Helper: reputation compute helper — Branch: feat/lib-reputation-helper — Helper + unit test; acceptance: unit test for sample data.
* T094 — DB: RFQ (request for quote) table — Branch: feat/db-rfq — Create `rfqs` table; acceptance: migration added.
* T095 — API: create RFQ and notify sellers — Branch: feat/api-rfq-create — POST /api/rfqs; acceptance: RFQ created + notification entry.
* T096 — UI: RFQ form on listing — Branch: feat/ui-rfq-form — RFQ modal; acceptance: modal submits successfully.
* T097 — Feature: invoice/PO PDF stub — Branch: feat/invoice-pdf-stub — JSON→PDF stub endpoint; acceptance: returns signed URL.
* T098 — UI: download PO/invoice on order page — Branch: feat/ui-order-invoice-link — Download button on order; acceptance: signed URL displayed.
* T099 — DB: buyer_preapproved flag — Branch: feat/db-buyer-qualification — Add `is_preapproved` to profiles; acceptance: column present.
* T100 — Admin: mark buyer pre-approval — Branch: feat/admin-buyer-approve — Admin toggle + audit_log; acceptance: profile updated.
* T101 — UI: show preapproved badge on buyer profile — Branch: feat/ui-buyer-preapproved-badge — Badge in profile & checkout gating; acceptance: badge visible.
* T102 — API: CSV upload endpoint for listings — Branch: feat/api-listings-import — POST /api/listings/import; acceptance: file stored and job id returned.
* T103 — UI: CSV mapping preview modal — Branch: feat/ui-listings-import-mapping — Mapping modal & preview; acceptance: mapping saved and API called.
* T104 — Worker: process listings CSV (skeleton) — Branch: feat/job-listings-import — Background import worker stub; acceptance: dry-run validates rows.
* T105 — Tests: CSV import validation tests — Branch: feat/test-listings-import — Unit tests for CSV parsing; acceptance: tests pass locally.
* T106 — API: pricing suggestion endpoint — Branch: feat/api-price-suggest — GET /api/price/suggest; acceptance: returns suggestion for sample input.
* T107 — UI: show suggested price hint in listing form — Branch: feat/ui-price-suggestion — Hint + apply action; acceptance: clicking applies suggestion.
* T108 — DB: schedule_at and expiry_at for listings — Branch: feat/db-listing-schedule — Add `schedule_at` and `expiry_at`; acceptance: migration adds fields.
* T109 — Worker: scheduled publish/expiry runner — Branch: feat/job-listing-scheduler — Cron to publish/expire listings; acceptance: dry-run shows intended changes.
* T110 — UI: schedule fields on create/edit listing — Branch: feat/ui-listing-schedule — Datepickers for schedule/expiry; acceptance: values persist.
* T111 — Analytics: view/save/contact counters (DB) — Branch: feat/db-analytics-counters — Add counters/events table; acceptance: DB change applied.
* T112 — API: analytics endpoints for seller — Branch: feat/api-analytics-seller — GET /api/analytics/seller; acceptance: returns sample counts.
* T113 — UI: export leads CSV button — Branch: feat/ui-export-leads — Export leads CSV; acceptance: API returns CSV.
* T114 — DB: moderation queue flag — Branch: feat/db-moderation-queue — Add moderation fields to listings; acceptance: columns added.
* T115 — UI: bulk edit modal (skeleton) — Branch: feat/ui-bulk-edit-modal — Admin bulk edit modal; acceptance: batch request summary returned.
* T116 — Worker: bulk edit apply job — Branch: feat/job-bulk-edit — Background worker to apply bulk edits; acceptance: dry-run logs summary.
* T117 — DB/UI: pickup scheduling for large lots — Branch: feat/pickup-scheduling — Reuse inspection slots for pickups; acceptance: buyer can request pickup slot.
* T118 — API: pickup confirmation notification — Branch: feat/notify-pickup — Notify seller & buyer on pickup booking; acceptance: notifications inserted.
* T119 — Settings/UI: PCI & privacy compliance flags — Branch: feat/settings-compliance-flags — Add compliance toggles to app_settings; acceptance: settings editable.
* T120 — Audit: compliance audit trail entry — Branch: feat/audit-compliance-log — Log compliance changes to audit_log; acceptance: entries recorded.
* T121 — Flow: onboarding workflow state machine — Branch: feat/onboarding-workflow — Add `onboarding_state` to profiles; acceptance: state updates on step completion.
* T122 — Notifications: onboarding automation triggers — Branch: feat/notify-onboarding — Onboarding notification triggers; acceptance: notifications created on simulated events.
* T123 — Admin: onboarding queue view — Branch: feat/admin-onboarding-queue — Admin page for onboarding queue; acceptance: list loads and actions update state.
* T124 — Job: auto-run KYC checks (skeleton) — Branch: feat/job-kyc-autocheck — KYC auto-check worker stub; acceptance: dry-run flags sample uploads.
* T125 — DB: reviews table tied to orders — Branch: feat/db-reviews — Create `reviews` table; acceptance: migration adds table.
* T126 — API: post-review (order-locked) — Branch: feat/api-post-review — POST /api/reviews; acceptance: review saved and visible.
* T127 — UI: review widget on order and seller profile — Branch: feat/ui-review-widget — Rating widget on order complete page; acceptance: submit stores review.
* T128 — Settings: insurance option toggle + price addon — Branch: feat/settings-insurance — Add insurance settings to app_settings; acceptance: setting stored.
* T129 — UI: insurance checkbox at checkout — Branch: feat/ui-checkout-insurance — Add insurance option at checkout; acceptance: selection reflected in payment amount.
* T130 — Lib: multi-currency display helper — Branch: feat/lib-currency-helper — Currency conversion helper; acceptance: returns converted sample.
* T131 — Settings: default currency and FX rate keys — Branch: feat/settings-currency — Add `currency.default` and `currency.rates` keys; acceptance: settings readable.
* T132 — UI: currency selector and converted price hint — Branch: feat/ui-currency-selector — Currency selector and price hint; acceptance: hint shows converted amount.
* T133 — DB/API: support tickets table and create endpoint — Branch: feat/db-support-tickets — Support tickets table + POST endpoint; acceptance: ticket created.
* T134 — Admin: support inbox view — Branch: feat/admin-support-inbox — Admin support viewer; acceptance: admin replies create notes and notifications.
* T135 — PWA: manifest + service worker stub — Branch: feat/pwa-manifest-sw — Add manifest.json & SW registration; acceptance: manifest served & SW registers.
* T136 — UI: responsive listing preview improvements — Branch: feat/ui-responsive-previews — Mobile CSS and accessibility tweaks; acceptance: mobile view improved.
* T137 — Test: offline listing preview smoke test — Branch: feat/test-pwa-offline — Manual e2e checklist for offline preview; acceptance: checklist passed.
* T138 — UI: deposit status consolidated component — Branch: feat/ui-deposit-status — Consolidated deposit status component; acceptance: shows auth/capture/refund states.
* T139 — API: deposit status aggregation endpoint — Branch: feat/api-deposit-status — GET /api/deposits/:orderId/status; acceptance: returns expected fields.
* T140 — API: save payment method consent flow (stub) — Branch: feat/api-save-payment-consent — POST /api/payments/save-consent; acceptance: consent saved.
* T141 — UI: toggle to save payment method — Branch: feat/ui-save-payment-toggle — Save-payment toggle in checkout; acceptance: preference stored.
* T142 — Lib: tax fields on invoice model — Branch: feat/lib-invoice-tax — Add tax fields to invoice model; acceptance: invoice JSON includes tax lines.
* T143 — Helper: tax calc stub — Branch: feat/lib-tax-calc — Basic tax computation helper + test; acceptance: unit test passes.
* T144 — Feature: attach PDF receipt to order — Branch: feat/order-receipt-pdf — Render receipt PDF & attach signed URL; acceptance: `order.receipt_url` populated.

---