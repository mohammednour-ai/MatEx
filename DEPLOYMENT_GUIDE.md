# MatEx Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the MatEx platform to production. The deployment involves setting up Supabase (database), Vercel (hosting), and Stripe (payments) in production mode.

## Prerequisites

Before starting deployment, ensure you have:

- [ ] Supabase account with billing enabled
- [ ] Vercel account
- [ ] Stripe account with live mode access
- [ ] Custom domain (optional but recommended)
- [ ] Email service provider (Gmail, SendGrid, etc.)

## Deployment Checklist

### Phase 1: Environment Setup

- [ ] Create production Supabase project
- [ ] Set up production Stripe account
- [ ] Configure email service
- [ ] Prepare environment variables
- [ ] Set up custom domain (optional)

### Phase 2: Database Setup

- [ ] Run database migrations
- [ ] Configure Row Level Security (RLS)
- [ ] Set up storage buckets
- [ ] Seed default data
- [ ] Verify database connectivity

### Phase 3: Application Deployment

- [ ] Deploy to Vercel
- [ ] Configure environment variables
- [ ] Set up webhooks
- [ ] Configure cron jobs
- [ ] Test deployment

### Phase 4: Production Testing

- [ ] Run end-to-end tests
- [ ] Verify payment processing
- [ ] Test email notifications
- [ ] Check security measures
- [ ] Performance testing

## Step-by-Step Deployment

### 1. Supabase Production Setup

#### Create Production Project
1. **Login to Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Click "New Project"

2. **Configure Project**
   ```
   Project Name: matex-production
   Database Password: [Generate strong password - save securely]
   Region: us-east-1 (or closest to your users)
   Pricing Plan: Pro (recommended for production)
   ```

3. **Save Project Details**
   ```
   Project URL: https://pqjpoqrhibauztgvyzbv.supabase.co
   Anon Key: eyJ[eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxanBvcXJoaWJhdXp0Z3Z5emJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NTQ5MzksImV4cCI6MjA3MzEzMDkzOX0.BjoKBGpd1dnRU60G9hNFm2EQABFlWkf5wpJoc1ISGm4]...
   Service Role Key: eyJ[eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxanBvcXJoaWJhdXp0Z3Z5emJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU1NDkzOSwiZXhwIjoyMDczMTMwOTM5fQ.VzKR747jSLux4ECfeQHhJV17hoWnlforV-l4hQl5ozo]...
   Database URL: postgresql://postgres:[password]@[host]:5432/postgres
   ```

#### Run Database Migrations
```bash
# Navigate to project directory
cd matex

# Install Supabase CLI if not already installed
npm install -g supabase

# Link to production project
supabase link --project-ref [your-project-ref]

# Run all migrations
supabase db push

# Verify migrations
supabase db status
```

#### Seed Default Data
```bash
# Seed application settings
node scripts/seed-settings.js

# Verify settings were created
# Check in Supabase dashboard: Tables > app_settings
```

### 2. Stripe Production Setup

#### Configure Stripe Account
1. **Switch to Live Mode**
   - Login to https://dashboard.stripe.com
   - Toggle from "Test mode" to "Live mode"

2. **Get API Keys**
   ```
   Publishable Key: pk_live_...
   Secret Key: sk_live_...
   ```

3. **Set up Webhooks**
   - Go to Developers > Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://your-domain.com/api/stripe/webhook`
   - Select events:
     - payment_intent.succeeded
     - payment_intent.payment_failed
     - payment_intent.canceled
     - checkout.session.completed
   - Copy webhook secret: `whsec_...`

### 3. Email Service Setup

#### Gmail Setup (Recommended for small scale)
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"
3. **Save credentials**
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=[app-password]
   ```

### 4. Vercel Deployment

#### Deploy Application
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
cd matex
vercel --prod
```

#### Configure Environment Variables
In Vercel Dashboard (https://vercel.com/dashboard):

1. **Go to your project > Settings > Environment Variables**

2. **Add Production Variables:**
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[anon-key]...
   SUPABASE_SERVICE_ROLE_KEY=eyJ[service-role-key]...

   # Stripe
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # Email
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=[app-password]
   EMAIL_FROM=noreply@yourdomain.com

   # Security
   NEXTAUTH_SECRET=[generate-random-string]
   NEXTAUTH_URL=https://your-domain.com
   CRON_SECRET=[generate-random-string]
   ```

3. **Set Environment to "Production"** for all variables

4. **Redeploy** after adding variables:
   ```bash
   vercel --prod
   ```

### 5. Custom Domain Setup (Optional)

#### Add Custom Domain
1. **In Vercel Dashboard**
   - Go to project > Settings > Domains
   - Add your domain (e.g., matexhub.ca)

2. **Configure DNS**
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Or add A record pointing to Vercel's IP

3. **Update Environment Variables**
   ```
   NEXTAUTH_URL=https://yourdomain.com
   ```

4. **Update Stripe Webhook URL**
   - In Stripe Dashboard, update webhook endpoint to your custom domain

### 6. Storage Configuration

#### Set up Supabase Storage
```sql
-- Connect to your production database and run:

-- Create listing images bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create KYC documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
);
```

## Production Verification

### 1. Basic Functionality Test
```bash
# Test application is accessible
curl -I https://your-domain.com
# Should return 200 OK

# Test API endpoints
curl https://your-domain.com/api/settings
# Should return settings JSON
```

### 2. Database Connectivity Test
- Visit your application at https://your-domain.com
- Try to sign up for a new account
- Check if the user profile is created in Supabase dashboard

### 3. Payment Processing Test
```bash
# Test Stripe webhook endpoint
curl -X POST https://your-domain.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}' \
  -w "%{http_code}\n"
# Should return 400 (missing signature - this is expected)
```

### 4. Email Service Test
- Complete user registration
- Check if welcome email is received
- Test password reset functionality

## Security Checklist

### Production Security Measures
- [ ] All environment variables properly secured
- [ ] Database RLS policies active and tested
- [ ] Stripe webhook signature verification enabled
- [ ] HTTPS enforced for all endpoints
- [ ] Rate limiting configured
- [ ] Error messages don't expose sensitive data
- [ ] File upload restrictions in place
- [ ] Admin routes properly protected

### Security Testing
```bash
# Test unauthorized access to admin routes
curl -I https://your-domain.com/admin
# Should return 401 or redirect to login

# Test file upload restrictions
# Try uploading files larger than limits
# Try uploading unauthorized file types
```

## Monitoring and Maintenance

### Set up Monitoring
1. **Vercel Analytics**
   - Enable in Vercel dashboard
   - Monitor performance and errors

2. **Supabase Monitoring**
   - Check database performance
   - Monitor storage usage
   - Set up alerts for high usage

3. **Stripe Monitoring**
   - Monitor webhook delivery success
   - Check for failed payments
   - Review dispute notifications

### Regular Maintenance Tasks
- [ ] **Weekly**: Review error logs and failed webhooks
- [ ] **Monthly**: Check database performance and optimize queries
- [ ] **Quarterly**: Rotate webhook secrets and API keys
- [ ] **Annually**: Review and update security measures

## Troubleshooting Common Issues

### Database Connection Issues
```bash
# Test database connection
psql "postgresql://postgres:[password]@[host]:5432/postgres" -c "SELECT 1;"

# Check migration status
supabase db status
```

### Stripe Webhook Issues
1. **Check webhook endpoint in Stripe dashboard**
2. **Verify webhook secret matches environment variable**
3. **Check Vercel function logs for errors**
4. **Test webhook signature verification**

### Email Delivery Issues
1. **Verify SMTP credentials**
2. **Check spam folders**
3. **Test with different email providers**
4. **Review email service logs**

## Rollback Procedures

### Emergency Rollback
```bash
# Rollback to previous Vercel deployment
vercel rollback

# Rollback database migrations (if needed)
supabase db reset --linked
# Then re-run specific migrations
```

### Environment Variable Rollback
1. **Keep backup of working environment variables**
2. **Document all changes with timestamps**
3. **Test rollback procedures in staging first**

## Success Criteria

✅ **Application Accessible**: Site loads correctly at production URL
✅ **Database Connected**: User registration and data persistence working
✅ **Payments Processing**: Stripe integration working with live keys
✅ **Emails Sending**: Notification emails being delivered
✅ **Security Active**: All security measures in place and tested
✅ **Monitoring Enabled**: Error tracking and performance monitoring active

## Post-Deployment Checklist

- [ ] Application accessible at production URL
- [ ] User registration and login working
- [ ] Database operations functioning
- [ ] File uploads working (images, documents)
- [ ] Payment processing operational
- [ ] Email notifications being sent
- [ ] Admin functions accessible
- [ ] Cron jobs running (check Vercel dashboard)
- [ ] Error monitoring active
- [ ] Performance monitoring enabled
- [ ] Backup procedures verified
- [ ] Documentation updated with production details

## Support and Resources

### Documentation References
- [Supabase Production Checklist](matex/docs/T073_SUPABASE_PRODUCTION_SETUP.md)
- [Vercel Configuration](matex/docs/T072_VERCEL_CONFIG.md)
- [Stripe Webhooks Setup](matex/docs/T074_STRIPE_WEBHOOKS_PROD.md)
- [Manual E2E Testing](matex/docs/T071_MANUAL_E2E_CHECKLIST.md)

### Emergency Contacts
- **Supabase Support**: https://supabase.com/support
- **Vercel Support**: https://vercel.com/support
- **Stripe Support**: https://support.stripe.com

### Useful Commands
```bash
# Check deployment status
vercel ls

# View function logs
vercel logs

# Check environment variables
vercel env ls

# Test database connection
supabase db status

# View Stripe webhook logs
# (Available in Stripe Dashboard > Developers > Webhooks)
```

## Notes

- Keep all credentials secure and rotate regularly
- Monitor usage to avoid unexpected billing
- Test all critical paths after deployment
- Document any production-specific configurations
- Plan for scaling as user base grows
- Regular security audits recommended
