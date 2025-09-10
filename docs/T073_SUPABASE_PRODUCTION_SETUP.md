# T073: Supabase Production Setup

**Branch:** `ops/supabase-prod`  
**Commit:** `ops: connect to production Supabase and run migrations`

## Overview

This document outlines the complete setup process for connecting the MatEx application to a production Supabase instance, including running migrations, configuring RLS policies, setting up storage buckets, and verifying all components work correctly in the production environment.

## Prerequisites

- [ ] Supabase account with billing enabled
- [ ] Production project created in Supabase dashboard
- [ ] Local development environment with all migrations tested
- [ ] Supabase CLI installed and authenticated
- [ ] Access to production environment variables

## Production Project Setup

### 1. Create Production Project

#### Supabase Dashboard Setup
- [ ] Log into [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Click "New Project"
- [ ] Configure production project:
  - [ ] Organization: Select appropriate organization
  - [ ] Project Name: `matex-production`
  - [ ] Database Password: Generate strong password (save securely)
  - [ ] Region: Select closest to target users (e.g., `us-east-1` for North America)
  - [ ] Pricing Plan: Select appropriate plan (Pro recommended for production)

#### Project Configuration
- [ ] Wait for project provisioning (5-10 minutes)
- [ ] Note down project details:
  - [ ] Project URL: `https://[project-ref].supabase.co`
  - [ ] Project API Key (anon): `eyJ...`
  - [ ] Project API Key (service_role): `eyJ...`
  - [ ] Database URL: `postgresql://postgres:[password]@[host]:5432/postgres`

### 2. Environment Variables Configuration

#### Production Environment Variables
Update production environment with Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[anon-key]
SUPABASE_SERVICE_ROLE_KEY=eyJ[service-role-key]
SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Additional Production Variables
NODE_ENV=production
SUPABASE_PROJECT_REF=[project-ref]
```

#### Vercel Environment Variables
If deploying to Vercel:
- [ ] Navigate to Vercel project settings
- [ ] Go to Environment Variables section
- [ ] Add production Supabase variables
- [ ] Set environment to "Production"
- [ ] Redeploy application

## Database Migration Process

### 3. Connect to Production Database

#### Supabase CLI Configuration
```bash
# Link to production project
supabase link --project-ref [project-ref]

# Verify connection
supabase status
```

#### Database Connection Verification
```bash
# Test connection with psql
psql "postgresql://postgres:[password]@[host]:5432/postgres"

# Or use Supabase CLI
supabase db reset --linked
```

### 4. Run Database Migrations

#### Migration Execution Order
Execute migrations in the correct sequence:

```bash
# Navigate to project directory
cd matex

# Run migrations in order
supabase db push

# Or run individual migrations if needed
psql -f supabase/migrations/001_profiles_rbac.sql "postgresql://..."
psql -f supabase/migrations/002_listings_images.sql "postgresql://..."
psql -f supabase/migrations/003_auctions_bids.sql "postgresql://..."
psql -f supabase/migrations/004_orders.sql "postgresql://..."
psql -f supabase/migrations/005_inspections.sql "postgresql://..."
psql -f supabase/migrations/006_app_settings_kyc.sql "postgresql://..."
psql -f supabase/migrations/007_notifications.sql "postgresql://..."
psql -f supabase/migrations/008_terms_acceptances.sql "postgresql://..."
psql -f supabase/migrations/009_audit_logs.sql "postgresql://..."
psql -f supabase/migrations/010_full_text_search.sql "postgresql://..."
```

#### Migration Verification
```sql
-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check specific tables
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM listings;
SELECT COUNT(*) FROM app_settings;
SELECT COUNT(*) FROM notification_templates;
```

### 5. Row Level Security (RLS) Verification

#### RLS Policy Audit
Verify all RLS policies are correctly applied:

```sql
-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Verify specific RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

#### Test RLS Policies
```sql
-- Test profile access (should only see own profile)
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "test-user-id", "role": "authenticated"}';
SELECT * FROM profiles; -- Should return empty or error

-- Test admin access
SET request.jwt.claims TO '{"sub": "admin-user-id", "role": "authenticated"}';
-- Admin should see all profiles if role is 'admin'
```

## Storage Configuration

### 6. Storage Buckets Setup

#### Create Storage Buckets
```sql
-- Create listing images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create KYC documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
);
```

#### Storage RLS Policies
```sql
-- Listing images - public read, authenticated upload
CREATE POLICY "Public can view listing images" ON storage.objects
FOR SELECT USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
);

-- KYC documents - private access
CREATE POLICY "Users can view own KYC documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own KYC documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 7. Seed Production Data

#### Default Settings
```bash
# Run settings seeding script
node scripts/seed-settings.js
```

#### Notification Templates
```sql
-- Insert default notification templates
INSERT INTO notification_templates (code, channel, subject, body_md, is_active) VALUES
('welcome_buyer', 'email', 'Welcome to MatEx', 'Welcome {{user_name}}! Your buyer account is ready.', true),
('welcome_seller', 'email', 'Welcome to MatEx', 'Welcome {{user_name}}! Your seller account is ready.', true),
('kyc_approved', 'email', 'KYC Approved', 'Your KYC verification has been approved.', true),
('kyc_rejected', 'email', 'KYC Requires Attention', 'Your KYC submission needs additional information.', true),
('bid_placed', 'inapp', 'New Bid', 'New bid of ${{amount}} placed on {{listing_title}}', true),
('outbid_notification', 'email', 'You have been outbid', 'Someone placed a higher bid on {{listing_title}}', true),
('auction_won', 'email', 'Congratulations! You won', 'You won the auction for {{listing_title}}', true),
('inspection_booked', 'email', 'Inspection Booked', 'Inspection scheduled for {{date}} at {{time}}', true),
('order_paid', 'email', 'Payment Received', 'Payment confirmed for order #{{order_id}}', true),
('order_fulfilled', 'email', 'Order Shipped', 'Your order #{{order_id}} has been fulfilled', true);
```

#### KYC Fields Configuration
```sql
-- Insert KYC field definitions
INSERT INTO kyc_fields (role, name, label, type, required, sort_order) VALUES
('buyer', 'full_name', 'Full Legal Name', 'text', true, 1),
('buyer', 'phone', 'Phone Number', 'text', true, 2),
('buyer', 'address', 'Address', 'text', true, 3),
('buyer', 'id_document', 'Government ID', 'file', true, 4),
('seller', 'company_name', 'Company Name', 'text', true, 1),
('seller', 'business_number', 'Business Registration Number', 'text', true, 2),
('seller', 'business_license', 'Business License', 'file', true, 3),
('seller', 'tax_document', 'Tax Registration', 'file', true, 4);
```

## Authentication Configuration

### 8. Auth Settings

#### Email Templates
Configure email templates in Supabase Dashboard:
- [ ] Navigate to Authentication > Email Templates
- [ ] Customize confirmation email template
- [ ] Set up password reset template
- [ ] Configure magic link template (if used)

#### Auth Providers
- [ ] Configure email/password authentication
- [ ] Set up OAuth providers if needed (Google, GitHub, etc.)
- [ ] Configure redirect URLs for production domain

#### Security Settings
```sql
-- Set auth configuration
UPDATE auth.config SET
  site_url = 'https://your-production-domain.com',
  jwt_expiry = 3600,
  refresh_token_rotation_enabled = true,
  security_update_password_require_reauthentication = true;
```

## Realtime Configuration

### 9. Realtime Setup

#### Enable Realtime for Tables
```sql
-- Enable realtime for bids table (auction updates)
ALTER PUBLICATION supabase_realtime ADD TABLE bids;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Verify realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

## Production Verification

### 10. End-to-End Testing

#### Database Connectivity
- [ ] Verify application connects to production database
- [ ] Test user registration and authentication
- [ ] Verify profile creation and KYC workflow
- [ ] Test listing creation and image upload

#### Storage Functionality
- [ ] Test image upload to listing-images bucket
- [ ] Verify KYC document upload to private bucket
- [ ] Check storage policies work correctly
- [ ] Test file deletion and cleanup

#### Real-time Features
- [ ] Test bid updates in real-time
- [ ] Verify notification delivery
- [ ] Check WebSocket connections

#### API Endpoints
- [ ] Test all API routes with production data
- [ ] Verify rate limiting works
- [ ] Check error handling and logging

### 11. Performance Optimization

#### Database Indexes
```sql
-- Verify critical indexes exist
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Add additional indexes if needed
CREATE INDEX CONCURRENTLY idx_listings_material_status 
ON listings(material, status) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_bids_auction_created 
ON bids(auction_id, created_at DESC);
```

#### Connection Pooling
- [ ] Configure connection pooling in Supabase dashboard
- [ ] Set appropriate pool size for expected load
- [ ] Monitor connection usage

## Security Checklist

### 12. Security Verification

#### Environment Security
- [ ] Verify service role key is not exposed in client code
- [ ] Check all environment variables are properly set
- [ ] Ensure database password is secure and rotated

#### RLS Security
- [ ] Audit all RLS policies for data leakage
- [ ] Test policies with different user roles
- [ ] Verify admin-only access is properly restricted

#### API Security
- [ ] Test API endpoints for unauthorized access
- [ ] Verify input validation and sanitization
- [ ] Check rate limiting is active

## Monitoring and Maintenance

### 13. Production Monitoring

#### Supabase Dashboard Monitoring
- [ ] Set up database performance monitoring
- [ ] Configure storage usage alerts
- [ ] Monitor API usage and quotas

#### Application Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor application performance
- [ ] Track user authentication issues

#### Backup Strategy
- [ ] Verify automatic backups are enabled
- [ ] Test backup restoration process
- [ ] Document backup retention policy

## Rollback Plan

### 14. Emergency Procedures

#### Database Rollback
```bash
# If migration issues occur
supabase db reset --linked
# Then re-run specific migrations
```

#### Environment Rollback
- [ ] Keep previous environment variables backed up
- [ ] Document rollback procedures
- [ ] Test rollback process in staging

## Success Criteria

✅ **Database Connected**: Application successfully connects to production Supabase instance

✅ **Migrations Applied**: All database migrations run successfully without errors

✅ **RLS Policies Active**: Row Level Security policies properly restrict data access

✅ **Storage Configured**: File upload and storage buckets work correctly with proper permissions

✅ **Authentication Working**: User registration, login, and session management function properly

✅ **Real-time Features**: Live updates for bids and notifications work correctly

✅ **Performance Optimized**: Database queries perform well under expected load

✅ **Security Verified**: All security measures are in place and tested

## Post-Deployment Tasks

- [ ] Monitor application logs for errors
- [ ] Track database performance metrics
- [ ] Verify backup processes are running
- [ ] Update documentation with production specifics
- [ ] Schedule regular security audits

## Related Tasks

- T001-T014: Database schema and migrations
- T072: Vercel configuration
- T074: Stripe webhooks production setup
- T075: Custom domain and SSL configuration

## Notes

- Keep production credentials secure and rotate regularly
- Monitor usage to avoid unexpected billing
- Test all critical paths after deployment
- Document any production-specific configurations
- Plan for scaling as user base grows
