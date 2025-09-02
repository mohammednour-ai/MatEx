# Database Schema (draft)

This file will track the database schema used by MatEx. Follow `project_rules.md`:

- Explain tables that will be added/modified per task
- Provide example SQL / Supabase migration snippets
- Link to `docs/SETTINGS_KEYS.md` for app-wide settings

## Conventions
- All tables use `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` where applicable
- Timestamps: `created_at TIMESTAMP WITH TIME ZONE DEFAULT now()` and `updated_at`

## Tables

### app_settings
| key | type | description |
|---|---|---|
| platform_fee_percent | numeric | Fee percentage applied to transactions |
| auction.deposit_required | boolean | Whether deposits are required for auction bidding |
| auction.deposit_percent | numeric | Percentage of auction value for deposit (e.g., 0.1 = 10%) |
| auction.deposit_flat_amount | numeric | Flat deposit amount in CAD (optional) |
| auction.deposit_strategy | text | Deposit calculation strategy: 'percent' or 'flat' |

### users
- id, email, profile fields, role

### auctions (Updated T036)
| Column | Type | Description |
|---|---|---|
| id | UUID PRIMARY KEY | Unique identifier |
| listing_id | UUID NOT NULL | Reference to listings(id) |
| start_at | TIMESTAMP WITH TIME ZONE | When auction starts |
| end_at | TIMESTAMP WITH TIME ZONE | When auction ends |
| min_increment_cad | DECIMAL(10,2) | Minimum bid increment |
| soft_close_seconds | INTEGER | Soft close extension time |
| status | VARCHAR(50) NOT NULL DEFAULT 'active' | Status: active, completed, cancelled |
| processed_at | TIMESTAMP WITH TIME ZONE | When deposits were processed |

**Indexes:**
- idx_auctions_status
- idx_auctions_end_at  
- idx_auctions_ended_active (composite for ended active auctions)

**Migration:** `migrations/002_add_auction_status_fields.sql`

### auction_deposits (T035)
| Column | Type | Description |
|---|---|---|
| id | UUID PRIMARY KEY | Unique identifier |
| user_id | UUID NOT NULL | Reference to auth.users(id) |
| auction_id | UUID NOT NULL | Reference to auctions(id) |
| stripe_payment_intent_id | VARCHAR(255) NOT NULL UNIQUE | Stripe PaymentIntent ID |
| amount_cad | DECIMAL(10,2) NOT NULL | Deposit amount in Canadian dollars |
| status | VARCHAR(50) NOT NULL | Status: pending, authorized, captured, cancelled, failed |
| created_at | TIMESTAMP WITH TIME ZONE | When deposit was created |
| updated_at | TIMESTAMP WITH TIME ZONE | When deposit was last updated |
| captured_at | TIMESTAMP WITH TIME ZONE | When deposit was captured (auction won) |
| cancelled_at | TIMESTAMP WITH TIME ZONE | When deposit was cancelled (auction lost) |

**Constraints:**
- Unique constraint on (user_id, auction_id) - one deposit per user per auction
- Foreign key constraints to auth.users and auctions tables
- Check constraint: amount_cad >= 0
- Check constraint: status IN ('pending', 'authorized', 'captured', 'cancelled', 'failed')

**Indexes:**
- idx_auction_deposits_user_id
- idx_auction_deposits_auction_id  
- idx_auction_deposits_status
- idx_auction_deposits_stripe_payment_intent_id
- idx_auction_deposits_created_at

**RLS Policies:**
- Users can view/insert/update their own deposits
- Service role can access all deposits

**Migration:** `migrations/001_create_auction_deposits.sql`

---
_Add table schemas and migration snippets as tasks are implemented._
