<!-- MatEx Code Review Report generated from MatEx_Code_Review_Report_TEMPLATE.md -->
# MatEx Code Review Report
**Date:** 2025-08-31 00:00:00 UTC

## 1) Executive Summary
- Overall status: WARNING — many core features implemented (T001–T030). Important policy gaps remain (validation, deposit enforcement, webhooks, rate-limiting).
- Key risks: Missing Zod validation on write endpoints; deposit authorization not enforced (T035 not implemented); no Stripe webhook handler / idempotency evidence; rate-limiting absent.
- Readiness for release: NOT READY. Address critical gaps before production deployment.

## 2) Scope of Review
- Repository: repo root (D:/MatEx)
- Branch: master (workspace context)
- Commits/Files inspected: `MATEX-MAIN-DEV.md`, `MATEX-MAIN-DEV-UPDATED.md`, `matex/` tree (key files listed in Appendix).
- Phases covered: Phase 0–5 (focused verification for T001–T030 per user request)

## 3) Requirements Compliance Matrix
| Requirement Source | ID/Task | Description | Implemented? | Evidence (file/line, endpoint) | Tests Exist? | Notes |
|---|---:|---|---:|---|---:|---|
| CSV / Dev log | T015 | GET /api/settings with 3-min cache | Yes | `matex/src/app/api/settings/route.ts` (cache, CACHE_TTL) | No automated tests found | Cache invalidation present (POST clears cache)
| CSV / Dev log | T016 | POST /api/settings (admin upsert + invalidation) | Yes | `matex/src/app/api/settings/route.ts` (POST, isUserAdmin) | No | Admin auth via Supabase user role lookup
| CSV / Dev log | T027 | Auction helpers (state, minNextBid) | Yes | `matex/src/lib/auction-helpers.ts` | No | Good use of app_settings lookup with defaults
| CSV / Dev log | T028 | POST /api/auctions/[id]/bid | Yes | `matex/src/app/api/auctions/[id]/bid/route.ts` | No | Bid flow implemented; deposit check is TODO (see code)
| CSV / Dev log | T029 | Realtime bids subscription | Yes | `matex/src/hooks/useAuctionRealtime.ts` | No | Subscriptions present
| CSV / Dev log | T030 | Outbid notifications | Yes | `matex/src/lib/notification-helpers.ts` and integration in bid route | No | Uses DB templates and notifications table
| Rules / Security | Zod validation | All write endpoints use Zod | No | No Zod schemas applied in inspected API routes (settings, bid) | No | GAP — see recommendations
| Rules / Security | No hardcoding; settings via app_settings/.env | Partially | `auction-helpers` and `settings` read `app_settings`; `supabaseServer` uses env checks | No | Some defaults fallback used when DB fetch fails
| Payments | Stripe webhooks & idempotency | No evidence | env.example contains STRIPE_WEBHOOK_SECRET; no webhook route found in repo | No | GAP — must add webhook route and idempotency handling
| Security | RLS policies present | Yes | `/matex/supabase/migrations/*.sql` (app_settings, profiles, listings, auctions, notifications, terms) | N/A | Migrations include RLS policies and triggers (evidence in migrations)
| Compliance | T&C consent before bid/deposit | Partially | Bid API checks KYC & email verification but does NOT check terms_acceptances table | No | GAP — explicit terms acceptance check missing before bids/deposits
| Security | Rate limiting | No evidence | No rate-limiter usage found in code or middleware | No | GAP — add rate limiting for write endpoints (bid, deposit, settings)

> Note: Matrix rows focus on high-priority items T015–T030 and selected rule checks from COPILOT-REVIEW-REQUEST. See Appendix for scanned files and exact locations.

## 4) Architecture & Stack Adherence
- Next.js 14 + TypeScript used in `matex/` (App Router). Evidence: `matex/src/app/...`, `next.config.ts`, `tsconfig.json`.
- Supabase used for DB and Realtime; server client created with service role in `src/lib/supabaseServer.ts` (env checks present).
- Stripe referenced in `.env.example` and DB migrations (orders contain stripe_payment_intent, checkout_session). No webhook route found.
- Tailwind/shadcn UI present in components and layout files.
- Zod: repo declares preference for Zod (README, docs), but I found no Zod request schemas in the inspected write endpoints (settings, bid).

## 5) Security & Compliance (RLS, authZ, secrets, PIPEDA)
- RLS: present in migrations (e.g., `supabase/migrations/006_app_settings_kyc.sql` enables RLS and policies). Evidence: migrations include CREATE POLICY and ENABLE ROW LEVEL SECURITY lines.
- API auth: settings POST checks admin role via `isUserAdmin()`; bid API expects middleware-provided user headers (x-user-id) and enforces email verified + KYC.
- Secrets: service role key and NEXT_PUBLIC_SUPABASE_URL are read from env and validated in `supabaseServer.ts`. `.env.example` contains Stripe keys and webhook secret placeholders.
- PIPEDA / privacy: terms_acceptances and terms_versions migrations exist. No audit of retention or PII masking in code beyond audit_logs migration (audit logs table present).

## 6) Performance & Reliability
- Indexes: migrations create indexes for orders (stripe ids), app_settings (category, is_public), and audit logs — evidence in `supabase/migrations/*.sql`.
- Caching: GET /api/settings implements in-memory cache with 3-minute TTL and invalidation on POST — implemented in `settings/route.ts`.
- Realtime: useAuctionRealtime hook present; Supabase Realtime subscriptions used.
- Webhooks: no webhook handler found — idempotency and signature verification not implemented (GAP).

## 7) Accessibility & UX
- Some aria attributes appear in UI components (e.g., `aria-hidden` in `src/app/page.tsx` and dashboard components). Basic accessibility practices present but not exhaustively verified.
- Error/empty/loading states: components and pages include loading/empty states per dev log entries; no automated a11y audit found.

## 8) Testing
- I found no automated unit tests or API tests in the `matex/` tree for the routes examined (no obvious `__tests__`, `vitest`/`jest` configs, or test files).
- Manual checks are documented in `MATEX-MAIN-DEV-UPDATED.md` per task, but automated coverage is missing.

## 9) Documentation
- Developer logs: `MATEX-MAIN-DEV-UPDATED.md` updated with T001–T030 entries (found and used as primary evidence).
- DB migrations and `supabase/README.md` provide schema docs.
- API route docs: limited; `docs/API_ROUTES.md` exists but not guaranteed to be up-to-date with implementation.

## 10) Findings
### Critical
- Missing Zod validation on write endpoints (required by project rules). Affects POST /api/settings and POST /api/auctions/[id]/bid and other write endpoints. (Impact: malformed requests, inconsistent error handling, security risk)
- Deposit enforcement not implemented. `bid` route contains TODO and skips deposit validation while `app_settings` indicate deposit_required defaults. (Impact: business logic gap — users can bid without deposit)
- No Stripe webhook handler found. Without signature verification and idempotency, payments flow cannot be trusted in prod. (Impact: payment state mismatch)

### Major
- Terms acceptance gating not enforced prior to bidding/deposit — bid API checks KYC/email but not `terms_acceptances`.
- No evidence of rate-limiting middleware for sensitive write endpoints (bid, deposit, checkout), exposing risk of abuse.
- No automated tests found for critical endpoints (bid, settings, auctions).

### Minor
- Some UI accessibility attributes present but no a11y audit; color contrast/focus states not verified.
- Documentation (API_ROUTES.md) may be out-of-sync; recommend single source-of-truth generation from code or tests.

## 11) Recommendations & Action Plan
- Short-term (apply before release):
  1. Add Zod validation schemas for all write endpoints (minimal changes):
     - File: `matex/src/app/api/auctions/[id]/bid/route.ts` — add `BidRequestSchema = z.object({ amount_cad: z.number().positive() })` and validate request body before business logic.
     - File: `matex/src/app/api/settings/route.ts` — add `SettingsPostSchema = z.object({ settings: z.array(z.object({ key: z.string(), value: z.any() })) })`.
  2. Enforce deposit authorization in bid flow (T035): implement a helper in `matex/src/lib/deposit-helpers.ts` and call from `bid/route.ts` before inserting bid.
  3. Add a Stripe webhook endpoint with signature verification and idempotency handling: create `matex/src/app/api/stripe/webhook/route.ts`. Use `STRIPE_WEBHOOK_SECRET` from env and persist processed event IDs in `webhook_events` table or use `orders.stripe_payment_intent` for idempotency.
  4. Enforce T&C acceptance check in `bid/route.ts` by calling a helper `src/lib/terms.ts::hasUserAcceptedCurrentTerms(userId)` which queries `terms_acceptances`.
  5. Add basic rate-limiter middleware (in-memory or Redis) and apply to POST /api/auctions/*, /api/deposits, /api/checkout, /api/settings.

- Medium-term:
  1. Add automated tests: unit tests for auction-helpers and integration tests for bid API and settings API. Place tests under `matex/tests/` and add a CI job.
  2. Add a webhook replay/idempotency tester and incorporate CI checks for webhook handling.
  3. Perform an a11y audit (axe) and add fixes for contrast/focus/ARIA where needed.

- Long-term:
  1. Generate API docs from validated route schemas (Zod -> OpenAPI) and keep `docs/API_ROUTES.md` in sync.
  2. Add end-to-end tests for core flows (signup/KYC/create listing/deposit/bid/win/pay).

## 12) Appendix
- Files scanned (selected):
  - `MATEX-MAIN-DEV.md` (canonical tasks)
  - `MATEX-MAIN-DEV-UPDATED.md` (task logs)
  - `matex/src/app/api/settings/route.ts` (settings API)
  - `matex/src/app/api/auctions/[id]/bid/route.ts` (bid API)
  - `matex/src/lib/auction-helpers.ts` (auction logic)
  - `matex/src/lib/notification-helpers.ts` (notifications)
  - `matex/src/lib/supabaseServer.ts` (supabase client)
  - `matex/supabase/migrations/*.sql` (migrations including RLS and audit logs)
  - `matex/src/hooks/useAuctionRealtime.ts` (realtime hook)

- Commands / searches used (examples):
  - grep for `app_settings`, `zod`, `stripe`, `webhook`, `rate limit` in `matex/` tree
  - opened `src/app/api/*` and `src/lib/*` files for verification

---
> Reviewer: MatEx automated reviewer
> Contact: repo maintainer
