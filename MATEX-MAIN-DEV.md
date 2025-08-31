# MATEX-MAIN-DEV

This file is a developer-oriented, sequential task list derived from `matex_full_task_list.csv` and organized to follow `project_rules.md` requirements.

Assumptions
- Default Status: `todo` (not started) unless noted.
- Default Test Status: `Not started`.
- Start Date / Completion Date left blank for you to fill when work begins/ends.
- Authentication/Keys Locator indicates where secrets or settings are expected (ENV = `.env` / Vercel env; DB = `app_settings` table in Supabase).

Instructions
- Work one task at a time in the CSV order. Create a feature branch for each task (e.g., `feat/...`, `db/...`, `chore/...`).
- After completing a task, update the `Status`, `Start Date`, `Completion Date`, and `Test Status` in this file and commit the change.

Legend of columns:
- TaskID: task identifier from CSV
- Title: short title
- Branch: suggested branch name
- Status: todo / in-progress / done / blocked
- Start Date / Completion Date: ISO dates (YYYY-MM-DD)
- Test Status: Not started / Manual pass / Unit tests / Failing / Needs review
- Description: short description / notes
- Modules/Apps/Uses: code areas impacted
- Authentication/Keys Locator: where credentials or settings are stored/accessed

---

## Sequential Tasks (Phase order preserved)

| # | TaskID | Title | Branch | Status | Start Date | Completion Date | Test Status | Description | Modules / Apps / Uses | Auth / Keys Locator |
|---:|---|---|---|---|---|---|---|---|---|---|
| 1 | T001 | Bootstrap repo | chore/init | todo |  |  | Not started | Create Next.js 14 (App Router) + TypeScript project, add TailwindCSS, init git, MIT license, README | app/, package.json, tailwind config, public/ | N/A |
| 2 | T002 | VS Code workspace & settings | chore/vscode-setup | todo |  |  | Not started | Add `.vscode/extensions.json` and `.vscode/settings.json` (format on save, Prettier, tailwind class sorting) | .vscode/ | N/A |
| 3 | T003 | EditorConfig + Prettier | chore/formatting | todo |  |  | Not started | Add `.editorconfig` and `.prettierrc` (2 spaces, LF, single quotes) | repo root configs | N/A |
| 4 | T004 | Env templates | chore/env | todo |  |  | Not started | Add `.env.example` with public and secret keys | `.env.example` | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |
| 5 | T005 | Supabase client helpers | feat/lib-supabase | todo |  |  | Not started | Create `lib/supabaseServer.ts` and `lib/supabaseClient.ts` using `@supabase/supabase-js` | lib/ (supabase helpers), server and client code | SUPABASE keys in ENV or secret manager (see `.env.example`) |
| 6 | T006 | Profiles + RBAC schema | db/profiles | todo |  |  | Not started | SQL migration: profiles table and RLS policies | db/migrations, supabase schema | DB migrations; RLS policies; no secret required (DB access for migrations)
| 7 | T007 | Listings + Images schema | db/listings | todo |  |  | Not started | SQL migration: listings and listing_images tables, RLS for seller CRUD | db/migrations, storage for images | N/A (migrations) |
| 8 | T008 | Auctions & Bids schema | db/auctions-bids | todo |  |  | Not started | SQL migration: auctions and bids, indexes | db/migrations, auctions domain logic | N/A |
| 9 | T009 | Orders schema | db/orders | todo |  |  | Not started | SQL migration: orders table with stripe_payment_intent field | db/migrations, payments module | N/A |
|10 | T010 | Inspections schema | db/inspections | todo |  |  | Not started | SQL migration: inspections and inspection_bookings tables | db/migrations, inspections domain | N/A |
|11 | T011 | App settings schema | db/app-settings | todo |  |  | Not started | SQL migration: app_settings (key, value jsonb) and kyc_fields table | db/migrations, admin/settings module | N/A (app_settings stored in DB)
|12 | T012 | Notifications schema | db/notifications | todo |  |  | Not started | SQL migration: notification_templates and notifications | db/migrations, notifications subsystem | N/A |
|13 | T013 | Terms acceptances | db/legal | todo |  |  | Not started | SQL migration: terms_acceptances(user_id, terms_version, accepted_at) | db/migrations, legal flows | N/A |
|14 | T014 | Commit migrations | db/commit | todo |  |  | Not started | Export and commit SQL migration files; idempotent scripts | db/migrations | N/A |
|15 | T015 | GET /api/settings | feat/api-settings-get | todo |  |  | Not started | Implement `app/api/settings/route.ts` with optional `?keys=a,b` and 3-min cache | app/api/settings | Requires SUPABASE_SERVICE_ROLE_KEY for server access; settings read from `app_settings` in DB |
|16 | T016 | POST /api/settings (admin) | feat/api-settings-post | todo |  |  | Not started | Admin-only upsert of settings; invalidate cache | app/api/settings | Admin auth (JWT / server role); SUPABASE_SERVICE_ROLE_KEY |
|17 | T017 | Seed default settings | chore/seed-settings | todo |  |  | Not started | Seed auction and notification defaults into `app_settings` | db/seeds, scripts/seed-settings | N/A (seeding uses DB admin creds)
|18 | T018 | Audit log table | db/audit-log | todo |  |  | Not started | Add `audit_log` table and helper to record changes | db/migrations, lib/audit.ts | N/A |
|19 | T019 | Auth wiring (server/client) | feat/auth | todo |  |  | Not started | Supabase auth hooks/server helpers for session reads and redirects | lib/auth, app/(middleware)/hooks | SUPABASE keys in ENV; session cookies handled server-side |
|20 | T020 | Dynamic onboarding (Buyer/Seller) | feat/onboarding-forms | todo |  |  | Not started | Onboarding forms rendering `kyc_fields` from DB, with validation and file upload | app/onboarding, kyc forms, storage | Storage creds: Supabase storage keys (ENV) and upload policies |
|21 | T021 | KYC upload & review status | feat/kyc-upload | todo |  |  | Not started | Document upload, metadata, status page | app/profile/kyc, storage | Storage keys; approvals via admin UI (no new env keys)
|22 | T022 | Terms consent gate | feat/terms-consent | todo |  |  | Not started | Require latest terms_version from `app_settings` at signup/before bid; modal to accept; record in `terms_acceptances` | app/auth flows, app/api/bid | Terms version tracked in DB `app_settings` |
|23 | T023 | Create listing UI | feat/listing-create | todo |  |  | Not started | Build `/sell/new` form, upload images to Supabase Storage | app/sell/new, storage, validations | Storage keys (ENV) |
|24 | T024 | Browse listings page | feat/listings-browse | todo |  |  | Not started | Implement `/browse` with filters and SSR pagination | app/browse, server components | N/A |
|25 | T025 | Listing detail page | feat/listing-detail | todo |  |  | Not started | Listing page with gallery, specs, inspection slots, pricing area | app/listings/[id] | N/A |
|26 | T026 | Search & FTS | feat/listings-search | todo |  |  | Not started | Add Postgres FTS, search bar with highlights | db/indices, app/search | N/A |
|27 | T027 | Auction helpers | feat/auction-hooks | todo |  |  | Not started | Helpers: isActive, timeLeft, currentHighBid, minNextBid (depends on settings) | lib/auction.ts, UI hooks | Reads `app_settings` for fee/min increment |
|28 | T028 | POST /api/auctions/[id]/bid | feat/api-bid | todo |  |  | Not started | Validate auction active, deposit authorized, amount >= minNextBid; soft-close extension | app/api/auctions/[id]/bid | Requires deposit/auth keys, SUPABASE_SERVICE_ROLE_KEY for server-side writes; Stripe for deposits (if applicable)
|29 | T029 | Realtime bids subscription | feat/bid-realtime | todo |  |  | Not started | Subscribe to bids via Supabase Realtime; optimistic UI updates | client hooks, realtime subscriptions | N/A (uses Supabase public realtime)
|30 | T030 | Outbid notifications | feat/outbid-notify | todo |  |  | Not started | Notify previous highest bidder via in-app/email using `notification_templates` | server triggers/listeners, notifications | Email sending via Nodemailer (stub) and notification templates in DB |
|31 | T031 | Manage inspection slots (seller) | feat/inspection-manage | todo |  |  | Not started | Seller CRUD for inspection slots with capacity and buffer validation | app/seller/inspections, server actions | N/A |
|32 | T032 | Book/cancel inspection (buyer) | feat/inspection-book | todo |  |  | Not started | Book and cancel inspection slots; capacity checks, notifications | app/inspections, bookings | N/A |
|33 | T033 | Inspection reminders | feat/inspection-reminders | todo |  |  | Not started | Send reminders X hours before slot via in-app/email | background jobs / cron, notifications | Notification templates and scheduler config in `app_settings` |
|34 | T034 | Stripe client setup | feat/stripe-setup | todo |  |  | Not started | Create `lib/stripe.ts`, load keys from ENV, test mode indicator UI | lib/stripe, payments UI | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET in ENV |
|35 | T035 | Authorize deposit | feat/api-deposit | todo |  |  | Not started | POST /api/deposits/authorize: create PaymentIntent, link to user+auction | app/api/deposits, payments flow | STRIPE keys in ENV; deposit percent from `app_settings` |
|36 | T036 | Release/refund deposits | feat/deposit-release | todo |  |  | Not started | Capture winner deposit, refund others; cron or server action | server jobs, payments | STRIPE keys; DB records for deposits
|37 | T037 | Deposit status UI | feat/deposit-ui | todo |  |  | Not started | Show deposit badges and CTA on auction page | app/auctions UI | N/A (reads deposit status from DB)
|38 | T038 | Fixed price checkout | feat/checkout-fixed | todo |  |  | Not started | Stripe Checkout for fixed listings; create Checkout Session and pending order | app/api/checkout/fixed, orders | STRIPE keys in ENV |
|39 | T039 | Auction winner invoice | feat/invoice-auction | todo |  |  | Not started | On auction close, create order, deduct deposit, create PaymentIntent | server jobs, orders | STRIPE keys; order records in DB
|40 | T040 | Stripe webhooks | feat/stripe-webhooks | todo |  |  | Not started | /api/stripe/webhook verifying signature; handle events and update orders | app/api/stripe/webhook | STRIPE_WEBHOOK_SECRET in ENV |
|41 | T041 | Payout delay & fees | feat/payout-fees | todo |  |  | Not started | Apply fees.transaction_percent; set payout delay from settings | orders, admin settings | fees in `app_settings` |
|42 | T042 | Bell dropdown UI | feat/notifications-ui | todo |  |  | Not started | Navbar bell with unread count and dropdown; notifications page | app/components/notifications | N/A |
|43 | T043 | Notification triggers | feat/notifications-triggers | todo |  |  | Not started | Server helpers to insert notifications on events (new bid, outbid, auction won...) | lib/notifications, triggers | N/A |
|44 | T044 | Email renderer | feat/email-templates | todo |  |  | Not started | Render email templates from DB, compile body_md with templating, send via nodemailer stub | lib/email, notification templates | NODemailer config in ENV (stub provider) |
|45 | T045 | User preferences | feat/notify-preferences | todo |  |  | Not started | Notification preferences page to toggle channels and digest frequency | app/settings/notifications | Stored per-user or in `app_settings`
|46 | T046 | Admin route guard | feat/admin-gate | todo |  |  | Not started | Admin guard for `/admin` based on `profiles.role='admin'` | app/admin, middleware | Auth uses Supabase session and RLS checks |
|47 | T047 | Settings editor UI | feat/admin-settings | todo |  |  | Not started | Admin CRUD editor for app settings with JSON editor + validation | app/admin/settings | Requires admin auth; writes use SUPABASE_SERVICE_ROLE_KEY or server-side API
|48 | T048 | KYC manager | feat/admin-kyc | todo |  |  | Not started | Approve/reject KYC with notes, preview docs, notify user | app/admin/kyc | N/A (reads storage, writes via admin UI)
|49 | T049 | Listings moderation | feat/admin-listings | todo |  |  | Not started | Moderation UI, bulk operations, inspections overview | app/admin/listings | N/A |
|50 | T050 | Payments & deposits | feat/admin-payments | todo |  |  | Not started | Dashboard for deposits/payouts and manual refund | app/admin/payments | STRIPE keys for refunds; audit logs
|51 | T051 | Notification templates CMS | feat/admin-templates | todo |  |  | Not started | CRUD for notification_templates with preview and variables | app/admin/notification-templates | N/A |
|52 | T052 | Legal CMS (Terms/Privacy) | feat/admin-cms-legal | todo |  |  | Not started | Editable markdown for Terms & Privacy with publish/version to `app_settings` | app/admin/legal | `terms_version` in `app_settings` stored in DB
|53 | T053 | Audit log viewer | feat/admin-audit | todo |  |  | Not started | Audit log viewer with filters | app/admin/audit | Reads `audit_log` table in DB
|54 | T054 | Brand theme & favicon | ui/brand | todo |  |  | Not started | Apply Tailwind theme, load Inter font, add favicon and navbar logo | styles/tailwind, public/favicon | N/A (favicon stored in public; fonts via Google/Local)
|55 | T055 | Landing hero + CTA | ui/landing | todo |  |  | Not started | Build landing hero with CTA and 3-step how-it-works | app/(landing) | N/A |
|56 | T056 | Browse filters & URL state | ui/filters | todo |  |  | Not started | Filters synced to URLSearchParams; SSR results | app/browse, client hooks | N/A |
|57 | T057 | Error/empty states | ui/states | todo |  |  | Not started | 404/500 pages and empty-state components | app/error, components/ui | N/A |
|58 | T058 | Loading & skeletons | ui/loading | todo |  |  | Not started | Skeleton components and spinner | components/loading | N/A |
|59 | T059 | Price trend charts | feat/analytics-prices | todo |  |  | Not started | Aggregate historical winning bids by material; API & client charts | analytics, API endpoints, client charts | N/A |
|60 | T060 | Trading volume tiles | feat/analytics-volumes | todo |  |  | Not started | Dashboard KPIs and caching | analytics, server cache | N/A |
|61 | T061 | Seller reputation score | feat/reputation-score | todo |  |  | Not started | Compute reputation based on fulfilment/disputes; badge on profile | lib/reputation, profile UI | N/A |
|62 | T062 | Export reports CSV | feat/export-reports | todo |  |  | Not started | Admin CSV exports for price/volume reports (streamed) | app/api/reports, admin | N/A |
|63 | T063 | Legal pages (Terms/Privacy/Refund) | legal/pages | todo |  |  | Not started | Add markdown pages and link in footer | app/(legal), public docs | N/A (content stored in repo/DB)
|64 | T064 | Consent gating before bid | legal/require-consent | todo |  |  | Not started | Enforce latest terms acceptance before POST /bid or /deposit | app/api/bid, middleware | Terms stored in `app_settings`; record in `terms_acceptances` table
|65 | T065 | Privacy & data retention | legal/privacy-retention | todo |  |  | Not started | Document retention policy and contact flow | docs/privacy, admin | N/A |
|66 | T066 | Cookie banner | legal/cookies | todo |  |  | Not started | Cookie consent banner storing analytics opt-in | app/components/cookie | N/A |
|67 | T067 | Rate limits for APIs | sec/rate-limit | todo |  |  | Not started | Add per-IP rate limits (in-memory or Upstash) for write endpoints | app/middleware, rate limiter | N/A (may require Upstash creds if used)
|68 | T068 | Zod validation | sec/validation | todo |  |  | Not started | Add Zod schemas for forms and APIs | lib/schemas, validations | N/A |
|69 | T069 | RLS policy review | sec/rls-review | todo |  |  | Not started | Audit RLS policies across DB for least privilege | db/review docs | N/A |
|70 | T070 | Accessibility pass | qa/a11y | todo |  |  | Not started | Improve ARIA, contrast, keyboard navigation and skip-to-content | UI components, styles | N/A |
|71 | T071 | Manual E2E checklist | qa/e2e-happy | todo |  |  | Not started | Document manual E2E flow covering signup->fulfilment | docs/QA, CHECKLIST.md | N/A |
|72 | T072 | Vercel config | ops/vercel | todo |  |  | Not started | Add `vercel.json` and map env vars for production | vercel.json, deployment docs | Vercel env vars map to `.env` keys |
|73 | T073 | Supabase production setup | ops/supabase-prod | todo |  |  | Not started | Connect to production Supabase, run migrations, verify RLS/storage | ops docs, migrations | Production SUPABASE keys (store securely)
|74 | T074 | Stripe webhooks (prod) | ops/stripe-webhooks | todo |  |  | Not started | Configure Stripe webhook in prod and test events | ops docs, webhook setup | STRIPE_WEBHOOK_SECRET in prod env
|75 | T075 | Custom domain & SSL | ops/domain | todo |  |  | Not started | Configure DNS, force HTTPS, add security headers | ops docs, Vercel settings | DNS provider credentials (ops)
|76 | T076 | Release tag v0.1.0 | release/v0.1.0 | todo |  |  | Not started | Tag the repo `v0.1.0` and finalize CHANGELOG | release notes, changelog | N/A |

---

If you'd like, I will: create a branch `chore/tasklist-md`, commit this file, and push it (follow Git Rules). I can also open a PR and set the first task `T001` as next actionable item and create `chore/init` branch to start scaffolding.

Updated: (update these fields as work proceeds)
