CI: Add typecheck + formatting + tests workflow

Area: repo root ci.yml
Priority: Quick
Acceptance: PRs must pass npx tsc --noEmit, prettier --check ., and unit tests.
Secret scanning in CI

Area: CI workflow + .github
Priority: Quick
Acceptance: CI fails if secrets appear in diffs (use truffleHog/secret-scan).
Persist DB types & regen script

Area: src/lib/db-types.ts, package.json scripts
Priority: Quick
Acceptance: npm run gen:types produces committed db-types and CI validates up-to-date file.
Replace settings in-memory cache with Redis fallback

Area: src/app/api/settings/route.ts (+ config)
Priority: High
Acceptance: Server uses Redis in prod; fallback to in-memory in dev.
Stripe keys validation startup check

Area: src/lib/stripe.ts
Priority: Quick
Acceptance: App refuses to start in dev when a live key is present and vice versa.
Webhook idempotency & queueing

Area: src/app/api/stripe/webhook/route.ts, src/lib/webhook-queue.ts
Priority: High
Acceptance: Webhook events are enqueued and processed idempotently; duplicates ignored.
Persist idempotency tokens for bids & payments

Area: DB table idempotency_keys, bid/deposit API routes
Priority: High
Acceptance: Replayed requests with same token return stored result.
Bid concurrency tests + DB locks

Area: src/app/api/auctions/[id]/bid/route.ts, tests tests/bids.concurrent.spec.ts
Priority: High
Acceptance: Simulated concurrent bids produce a single valid highest bid and no DB constraint violations.
Move soft-close logic into DB transaction/function

Area: supabase/migrations/* and src/lib/auction-helpers.ts
Priority: High
Acceptance: Soft-close extension performed atomically in DB; no race windows.
Deposit/Payment reconciliation job

Area: src/jobs/reconcileStripe.ts, cron config
Priority: High
Acceptance: Discrepancies between DB and Stripe are logged and alerted; daily run exists.
Persist notification delivery state + retry DLQ

Area: src/lib/notification-helpers.ts, notifications table schema
Priority: High
Acceptance: Failed sends are retried with dead-letter logging after X attempts.
Template variable validation + preview tests

Area: matex/src/app/admin/templates/*, unit tests
Priority: Medium
Acceptance: Each template has a validation test that runs on CI and renders sample preview.
RLS integration tests for critical tables

Area: tests/integration/rls-*.spec.ts (profiles, listings, orders)
Priority: High
Acceptance: Authenticated/anon/admin access tests confirm RLS behavior.
Money: enforce cents integer usage + constraints

Area: migrations supabase/migrations/*, code money helpers
Priority: High
Acceptance: All monetary fields stored as integer cents with DB CHECK constraints and unit tests.
Audit log partitioning / archiving policy

Area: supabase/migrations/018_audit_logs.sql + cron job
Priority: Medium
Acceptance: Audit logs older than threshold are archived/partitioned automatically.
Realtime scaling: limit subscriptions & fallback

Area: src/hooks/useAuctionRealtime.ts, server subscription config
Priority: Medium
Acceptance: Subscriptions have safeguards (max clients/channel) and fallback polling is supported.
Add monitoring & alerts (webhooks, reconciliation, job failures)

Area: Sentry/Datadog/Simple monitoring integrations + runbooks
Priority: High
Acceptance: Alerts exist for webhook failures, reconcile mismatches, and job errors sent to Slack/SRE.
Legal publish workflow with approver audit

Area: matex/src/app/admin/legal/*, audit log integration
Priority: High
Acceptance: Publishing legal content requires approver sign-off recorded in audit logs.
Consent gating: service API bypass & UX soft-notice

Area: src/app/api/*/bid, src/app/legal/*
Priority: Quick
Acceptance: System APIs accept authorized backoffice keys; users receive advance notice before forced re-acceptance.
Add dev reproducible environment (docker-compose)

Area: dev/docker-compose.yml, README.dev.md
Priority: Quick
Acceptance: One command spins up Postgres/Supabase-mock and app for local testing.
Add lightweight analytics funnel & CAC tracking

Area: tracking hooks + event exports (search, signup, listing creation)
Priority: Medium
Acceptance: Basic funnel events exist and export to analytics (CSV/Metabase).
Skeleton UX & performance optimizations for heavy pages

Area: listing pages, audit, admin — src/components/*
Priority: Quick
Acceptance: Skeletons show for slow loads; Lighthouse scores improve on perceived performance.
Add payment & refund idempotency for admin refunds

Area: src/app/api/admin/payments/*
Priority: High
Acceptance: Refund endpoints use idempotency keys and persist outcome.
Documentation: runbook and deployment checklist

Area: docs/runbook.md, docs/deploy.md
Priority: Quick
Acceptance: Clear rollback, migration, and emergency steps exist.
Business dashboards (GMV, deposits, pending invoices)

Area: SQL views + Metabase/Grafana dashboards
Priority: Medium
Acceptance: Dashboards updated daily and accessible via admin.