# Settings Keys

Centralized application settings stored in `app_settings` (DB) or environment variables.

Recommended keys (examples):
- `platform_fee_percent` (numeric) — platform fee
- `deposit_min_amount` (numeric) — minimum deposit
- `terms_version` (string) — current terms & conditions version
- `stripe_api_key` — stored in ENV or in Supabase secret manager

Update this file when adding new keys.
