# API Routes

This file documents serverless API routes (Next.js App Router) as tasks are implemented.

## Conventions
- Place route handlers under `app/api/.../route.ts`
- Use Zod for request validation
- Return JSON responses with `{ status: 'ok' | 'error', data?: ..., error?: ... }`

## Example entry
### POST /api/auctions/[id]/bid
- Summary: place a bid on auction `id` with soft-close behavior
- Handler: `app/api/auctions/[id]/bid/route.ts`
- Validation: Zod schema `BidRequestSchema` with `amount: number` and `bidder_id: UUID`

_Add endpoints per task and link to tests._
