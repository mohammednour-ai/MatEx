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

## Deposit Management (T035)

### POST /api/deposits/authorize
- Summary: Authorize deposit for auction bidding
- Handler: `app/api/deposits/authorize/route.ts`
- Validation: Zod schema `DepositAuthorizationSchema` with `auction_id: UUID` and optional `payment_method_id: string`
- Response: `{ success: boolean, payment_intent_id?: string, client_secret?: string, amount_cad?: number, status?: string, requires_action?: boolean }`
- Related table: `auction_deposits`

### GET /api/deposits/status
- Summary: Check deposit authorization status for auction(s)
- Handler: `app/api/deposits/status/route.ts`
- Query params: `auction_id: UUID` OR `auction_ids: string` (comma-separated UUIDs)
- Response: Single auction: `{ is_authorized: boolean, payment_intent_id?: string, amount_cad?: number, status?: string }`
- Response: Multiple auctions: `Record<auction_id, { is_authorized: boolean, amount_cad?: number, status?: string }>`
- Related table: `auction_deposits`

### POST /api/deposits/[payment_intent_id]/capture
- Summary: Capture authorized deposit (when auction is won)
- Handler: `app/api/deposits/[payment_intent_id]/capture/route.ts`
- Response: `{ success: boolean, message?: string, error?: string }`
- Related table: `auction_deposits`

### POST /api/deposits/[payment_intent_id]/cancel
- Summary: Cancel authorized deposit (when auction is lost/cancelled)
- Handler: `app/api/deposits/[payment_intent_id]/cancel/route.ts`
- Response: `{ success: boolean, message?: string, error?: string }`
- Related table: `auction_deposits`

### POST /api/auctions/[id]/bid (Updated for T035)
- Summary: Place a bid on auction `id` with deposit authorization check
- Handler: `app/api/auctions/[id]/bid/route.ts`
- Validation: Zod schema `BidSchema` with `amount_cad: number`
- Deposit Check: Verifies user has authorized deposit before allowing bid
- Response: `{ error: string, requires_deposit?: boolean, auction_id?: string }` if deposit required
- Related tables: `auction_deposits`, `auctions`

## Auction Processing (T036)

### POST /api/auctions/process-ended
- Summary: Process ended auctions and handle deposit capture/cancellation
- Handler: `app/api/auctions/process-ended/route.ts`
- Authentication: Admin role OR cron secret header (`x-cron-secret`)
- Query params: `auction_id: UUID` (optional - process specific auction), `force: boolean` (optional)
- Response: `{ success: boolean, processed_auctions: number, successful_auctions: number, failed_auctions: number, errors: string[], timestamp: string }`
- Related tables: `auctions`, `auction_deposits`, `orders`

### GET /api/auctions/process-ended
- Summary: Get processing status for ended auctions
- Handler: `app/api/auctions/process-ended/route.ts`
- Authentication: Required (any authenticated user)
- Query params: `auction_id: UUID` (optional - get status for specific auction)
- Response: Single auction: `{ auction_status: string, total_deposits: number, captured_deposits: number, cancelled_deposits: number, pending_deposits: number }`
- Response: All auctions: `{ pending_auctions: number, auction_ids: string[], last_check: string }`
- Related tables: `auctions`, `auction_deposits`

## UI Components (T037)

### Deposit Status UI Components
- **Components**: `DepositStatusBadge`, `DepositRequirementBanner`, `BiddingGate`, `AuctionDisplay`, `AuctionBidHistory`
- **Documentation**: `docs/T037_DEPOSIT_STATUS_UI.md`
- **API Dependencies**: 
  - `GET /api/deposits/status?auction_id={id}` - Used by all deposit status components
  - `GET /api/auctions/{id}/deposit-estimate` - Used by DepositRequirementBanner (future endpoint)
  - `GET /api/auctions/{id}/bids?limit={n}` - Used by AuctionBidHistory (future endpoint)
- **Features**: 
  - Real-time deposit status checking
  - Bidding gate with authentication and deposit authorization
  - Comprehensive auction display with integrated deposit UI
  - Bid history with user identification
  - Multiple component variants for different use cases

_Add endpoints per task and link to tests._
