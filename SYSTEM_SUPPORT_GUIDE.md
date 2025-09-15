# MatEx Platform - System Support Guide

## Table of Contents
1. [Service Management](#service-management)
2. [Important Logs & Monitoring](#important-logs--monitoring)
3. [Useful Administrative Commands](#useful-administrative-commands)
4. [Admin Preferences & Configuration Values](#admin-preferences--configuration-values)
5. [Keys & Tokens Management](#keys--tokens-management)
6. [Emergency Procedures](#emergency-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Service Management

### Core Services Overview
The MatEx platform consists of several interconnected services:

- **Frontend Application**: Next.js app hosted on Vercel
- **Database**: Supabase PostgreSQL with Realtime
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Payment Processing**: Stripe
- **Email Service**: Nodemailer with Gmail/SMTP
- **Cron Jobs**: Vercel Cron for scheduled tasks

### Starting/Stopping Services

#### Development Environment

**Start All Services:**
```bash
# Navigate to project directory
cd matex

# Install dependencies (if needed)
npm install

# Start development server
npm run dev

# Start Supabase local development (if using local)
npx supabase start
```

**Stop Services:**
```bash
# Stop development server: Ctrl+C in terminal

# Stop Supabase local development
npx supabase stop
```

#### Production Environment (Vercel)

**Deploy/Redeploy:**
```bash
# Deploy to production
vercel --prod

# Or trigger deployment via Git push to main branch
git push origin main
```

**Service Status Checks:**
```bash
# Check Vercel deployment status
vercel ls

# Check domain status
vercel domains ls
```

### Service Dependencies

**Critical Dependencies:**
1. **Supabase** - Database, Auth, Storage, Realtime
2. **Stripe** - Payment processing
3. **Vercel** - Hosting and serverless functions
4. **Gmail/SMTP** - Email notifications

**Service Health Endpoints:**
- Application: `https://matexhub.ca/api/health`
- Database: Check via Supabase dashboard
- Stripe: Check via Stripe dashboard

---

## Important Logs & Monitoring

### Log Locations

#### Vercel Logs
```bash
# View function logs
vercel logs

# View logs for specific deployment
vercel logs [deployment-url]

# Real-time logs
vercel logs --follow
```

#### Supabase Logs
- **Location**: Supabase Dashboard > Logs
- **Types**: Database, Auth, Storage, Edge Functions, Realtime

#### Application Logs
- **Server-side**: Vercel Function logs
- **Client-side**: Browser console, Vercel Analytics

### Critical Log Patterns to Monitor

#### Authentication Issues
```
Pattern: "Auth error", "Invalid token", "Session expired"
Location: Supabase Auth logs, Vercel function logs
Action: Check auth configuration, token expiry settings
```

#### Payment Failures
```
Pattern: "Stripe webhook failed", "Payment intent failed", "Deposit authorization failed"
Location: Vercel function logs, Stripe dashboard
Action: Check webhook endpoints, API keys, payment flow
```

#### Database Connection Issues
```
Pattern: "Connection timeout", "Pool exhausted", "Database error"
Location: Supabase logs, Vercel function logs
Action: Check connection limits, query performance
```

#### Auction/Bidding Issues
```
Pattern: "Bid failed", "Realtime connection lost", "Auction state error"
Location: Supabase Realtime logs, application logs
Action: Check realtime subscriptions, auction logic
```

### Monitoring Commands

```bash
# Check application health
curl https://matexhub.ca/api/health

# Monitor database connections
node scripts/test-db-connection.mjs

# Test email service
node scripts/test-email-connection.mjs

# Test Stripe connection
node scripts/test-stripe-connection.mjs

# Test NextAuth configuration
node scripts/test-nextauth-config.mjs
```

---

## Useful Administrative Commands

### Database Management

```bash
# Apply database migrations
node scripts/apply-migrations.mjs

# Seed default settings
node scripts/seed-settings.js

# Test database connection
node scripts/test-db-connection.mjs

# Connect to Supabase CLI
npx supabase login
npx supabase link --project-ref [PROJECT_REF]
```

### Development & Testing

```bash
# Run development server
npm run dev

# Build production version
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Seed default settings
npm run seed:settings

# Check logo exists
npm run check:logo

# Generate logo variants
npm run generate:logos

# Test email functionality
node scripts/simple-email-test.mjs
```

### Deployment Commands

```bash
# Deploy to Vercel
vercel --prod

# Check deployment status
vercel ls

# View environment variables
vercel env ls

# Add environment variable
vercel env add [NAME] [VALUE] production

# Remove environment variable
vercel env rm [NAME] production
```

### Logo & Asset Management

```bash
# Generate logo variants
node scripts/generate_logos_sharp.js

# Check logo exists
node scripts/check_logo_exists.js
```

### Backup & Recovery

```bash
# Export Supabase data (via dashboard or CLI)
npx supabase db dump --file backup.sql

# Import data
npx supabase db reset --file backup.sql
```

---

## Admin Preferences & Configuration Values

### Application Settings (app_settings table)

#### Core Configuration
```sql
-- View all settings
SELECT * FROM app_settings ORDER BY category, key;

-- Critical settings to monitor:
SELECT * FROM app_settings WHERE key IN (
  'site_name',
  'site_description',
  'maintenance_mode',
  'registration_enabled',
  'kyc_required',
  'auction_enabled',
  'fixed_price_enabled'
);
```

#### Default Values
- `site_name`: "MatEx - Canadian Marketplace"
- `site_description`: "Marketplace for waste and scrap materials"
- `maintenance_mode`: false
- `registration_enabled`: true
- `kyc_required`: true
- `auction_enabled`: true
- `fixed_price_enabled`: true
- `max_file_size_mb`: 10
- `supported_file_types`: "jpg,jpeg,png,pdf,doc,docx"

#### Payment Settings
- `stripe_fee_percentage`: 2.9
- `platform_fee_percentage`: 5.0
- `deposit_percentage`: 10.0
- `payout_delay_days`: 7

#### Notification Settings
- `email_notifications_enabled`: true
- `realtime_notifications_enabled`: true
- `notification_retention_days`: 30

### Admin User Management

```sql
-- View admin users
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'admin';

-- Grant admin access
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';

-- Revoke admin access
UPDATE profiles 
SET role = 'buyer' 
WHERE email = 'user@example.com';
```

### KYC Management

```sql
-- View pending KYC reviews
SELECT p.email, p.kyc_status, p.kyc_submitted_at
FROM profiles p
WHERE kyc_status = 'pending'
ORDER BY kyc_submitted_at ASC;

-- Approve KYC
UPDATE profiles 
SET kyc_status = 'approved', kyc_reviewed_at = NOW()
WHERE id = '[USER_ID]';

-- Reject KYC
UPDATE profiles 
SET kyc_status = 'rejected', kyc_reviewed_at = NOW()
WHERE id = '[USER_ID]';
```

---

## Keys & Tokens Management

### Environment Variables Overview

#### Production Environment Variables (Vercel)
```bash
# View all environment variables
vercel env ls

# Critical variables to maintain:
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon_key]
SUPABASE_SERVICE_ROLE_KEY=[service_role_key]
NEXTAUTH_SECRET=[random_secret]
NEXTAUTH_URL=https://matexhub.ca
STRIPE_SECRET_KEY=sk_live_[key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[key]
STRIPE_WEBHOOK_SECRET=whsec_[secret]
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=[gmail_user]
EMAIL_PASS=[gmail_app_password]
EMAIL_FROM=noreply@matexhub.ca
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=[gmail_user]
SMTP_PASS=[gmail_app_password]
CRON_SECRET=[cron_secret]
```

### Key Rotation Procedures

#### Supabase Keys
1. **Anon Key**: Rarely needs rotation, safe to expose publicly
2. **Service Role Key**: Rotate if compromised
   ```bash
   # Update in Vercel
   vercel env add SUPABASE_SERVICE_ROLE_KEY [new_key] production
   vercel env rm SUPABASE_SERVICE_ROLE_KEY production
   ```

#### NextAuth Secret
```bash
# Generate new secret
openssl rand -base64 32

# Update in Vercel
vercel env add NEXTAUTH_SECRET [new_secret] production
vercel env rm NEXTAUTH_SECRET production
```

#### Stripe Keys
1. **Test Keys**: For development/staging
2. **Live Keys**: For production
   ```bash
   # Rotate Stripe keys (get from Stripe dashboard)
   vercel env add STRIPE_SECRET_KEY sk_live_[new_key] production
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY pk_live_[new_key] production
   ```

#### Webhook Secrets
```bash
# Stripe webhook secret (from Stripe dashboard)
vercel env add STRIPE_WEBHOOK_SECRET whsec_[new_secret] production
```

#### Email Credentials
```bash
# Gmail app password (generate from Google Account settings)
vercel env add EMAIL_PASS [new_app_password] production
```

### Security Best Practices

1. **Regular Key Rotation**: Rotate sensitive keys quarterly
2. **Access Control**: Limit who has access to production keys
3. **Monitoring**: Monitor for unauthorized key usage
4. **Backup**: Keep secure backup of critical keys
5. **Documentation**: Document key purposes and rotation dates

---

## Emergency Procedures

### Service Outage Response

#### 1. Identify Affected Services
```bash
# Check application status
curl -I https://matexhub.ca

# Check Vercel status
vercel ls

# Check Supabase status (dashboard)
# Check Stripe status (dashboard)
```

#### 2. Enable Maintenance Mode
```sql
-- Enable maintenance mode
UPDATE app_settings 
SET value = 'true' 
WHERE key = 'maintenance_mode';
```

#### 3. Communication
- Update status page (if available)
- Notify users via email/social media
- Document incident in audit logs

### Data Recovery Procedures

#### Database Recovery
```bash
# Restore from Supabase backup
npx supabase db reset --file [backup_file.sql]

# Or use Supabase dashboard point-in-time recovery
```

#### File Recovery
- Use Supabase Storage backup/versioning
- Restore from Vercel deployment history

### Security Incident Response

#### 1. Immediate Actions
```bash
# Rotate all API keys
# Revoke compromised user sessions
# Enable additional logging
```

#### 2. Investigation
```sql
-- Check audit logs
SELECT * FROM audit_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check suspicious activities
SELECT * FROM profiles 
WHERE last_sign_in_at >= NOW() - INTERVAL '24 hours'
AND suspicious_activity = true;
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Authentication Problems
**Symptoms**: Users can't log in, session errors
**Solutions**:
```bash
# Check NextAuth configuration
node scripts/test-nextauth-config.mjs

# Verify Supabase auth settings
# Check NEXTAUTH_URL and NEXTAUTH_SECRET
```

#### 2. Payment Issues
**Symptoms**: Payment failures, webhook errors
**Solutions**:
```bash
# Test Stripe connection
node scripts/test-stripe-connection.mjs

# Check webhook endpoint: https://matexhub.ca/api/webhooks/stripe
# Verify webhook secret matches Stripe dashboard
```

#### 3. Database Connection Issues
**Symptoms**: Connection timeouts, query failures
**Solutions**:
```bash
# Test database connection
node scripts/test-db-connection.mjs

# Check connection pool settings
# Monitor active connections in Supabase dashboard
```

#### 4. Email Delivery Problems
**Symptoms**: Emails not sending, SMTP errors
**Solutions**:
```bash
# Test email connection
node scripts/test-email-connection.mjs

# Check Gmail app password
# Verify EMAIL_FROM domain
```

#### 5. Real-time Features Not Working
**Symptoms**: Live bidding not updating, notifications delayed
**Solutions**:
- Check Supabase Realtime logs
- Verify WebSocket connections
- Check RLS policies for realtime tables

### Performance Issues

#### Database Performance
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Application Performance
- Monitor Vercel Analytics
- Check Core Web Vitals
- Review function execution times

### Contact Information

**Emergency Contacts**:
- System Administrator: [admin@matexhub.ca]
- Development Team: [dev@matexhub.ca]
- Infrastructure: [ops@matexhub.ca]

**External Support**:
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Stripe Support: https://support.stripe.com

---

## Document Maintenance

**Last Updated**: December 2024
**Version**: 1.0
**Next Review**: March 2025

**Change Log**:
- v1.0: Initial system support documentation
