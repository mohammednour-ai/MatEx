# Database Schema (draft)

This file will track the database schema used by MatEx. Follow `project_rules.md`:

- Explain tables that will be added/modified per task
- Provide example SQL / Supabase migration snippets
- Link to `docs/SETTINGS_KEYS.md` for app-wide settings

## Conventions
- All tables use `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` where applicable
- Timestamps: `created_at TIMESTAMP WITH TIME ZONE DEFAULT now()` and `updated_at`

## Example tables (placeholders)

### app_settings
| key | type | description |
|---|---|---|
| platform_fee_percent | numeric | Fee percentage applied to transactions |
| deposits_enabled | boolean | Whether deposits are enabled |

### users
- id, email, profile fields, role

### auctions
- id, seller_id, status, soft_close_at, current_price

---
_Add table schemas and migration snippets as tasks are implemented._
