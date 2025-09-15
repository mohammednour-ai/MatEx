# MatEx Quick Start Guide

## What You Need to Do Right Now

Based on your MatEx project analysis, here's your immediate action plan for deployment and testing:

## 🚀 Immediate Actions (Next 2-4 Hours)

### 1. Fix Package.json Merge Conflict
```bash
cd matex
# Your package.json has a merge conflict - fix it first
git status
git add package.json
git commit -m "fix: resolve package.json merge conflict"
```

### 2. Set Up Local Development Environment
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your development credentials
# You'll need:
# - Supabase project URL and keys
# - Stripe test keys
# - Email configuration (optional for testing)
```

### 3. Test Local Development
```bash
# Start development server
npm run dev

# Visit http://localhost:3000
# Verify the application loads without errors
```

## 📋 Today's Deployment Checklist

### Phase 1: Environment Setup (1-2 hours)

#### Supabase Setup
- [ ] Create Supabase account at https://supabase.com
- [ ] Create new project: "matex-production"
- [ ] Save project URL and API keys
- [ ] Install Supabase CLI: `npm install -g supabase`

#### Stripe Setup
- [ ] Create Stripe account at https://stripe.com
- [ ] Get test API keys (pk_test_... and sk_test_...)
- [ ] Later: Switch to live keys for production

#### Vercel Setup
- [ ] Create Vercel account at https://vercel.com
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Connect your GitHub repository

### Phase 2: Database Setup (30-60 minutes)

```bash
# Link to your Supabase project
cd matex
supabase link --project-ref YOUR_PROJECT_REF

# Run database migrations
supabase db push

# Seed default settings
node scripts/seed-settings.js

# Verify in Supabase dashboard that tables were created
```

### Phase 3: Deploy to Vercel (30 minutes)

```bash
# Deploy to Vercel
cd matex
vercel

# Follow prompts to connect your project
# Choose "matex" as project name
# Set build command: npm run build
# Set output directory: .next
```

#### Configure Environment Variables in Vercel
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (get this after setting up webhooks)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
NEXTAUTH_SECRET=generate-random-32-char-string
NEXTAUTH_URL=https://your-vercel-app.vercel.app
CRON_SECRET=generate-random-32-char-string
```

### Phase 4: Set Up Stripe Webhooks (15 minutes)

1. **In Stripe Dashboard:**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://your-vercel-app.vercel.app/api/stripe/webhook`
   - Select events: payment_intent.succeeded, payment_intent.payment_failed
   - Copy webhook secret (whsec_...)

2. **Update Vercel Environment:**
   - Add STRIPE_WEBHOOK_SECRET with the webhook secret
   - Redeploy: `vercel --prod`

## 🧪 Testing Your Deployment (1-2 hours)

### Quick Smoke Tests

1. **Basic Functionality:**
   ```bash
   # Test site is accessible
   curl -I https://your-vercel-app.vercel.app
   # Should return 200 OK
   
   # Test API endpoint
   curl https://your-vercel-app.vercel.app/api/settings
   # Should return JSON with settings
   ```

2. **User Registration Test:**
   - Visit your deployed site
   - Try to register a new user
   - Check if user appears in Supabase dashboard

3. **Database Connectivity:**
   - Go to Supabase dashboard
   - Check Tables → profiles
   - Verify your test user was created

### Full E2E Testing (Use the detailed checklist)

Follow the comprehensive testing guide in `TESTING_GUIDE.md` for complete testing procedures.

## 🔧 Common Issues and Quick Fixes

### Issue: "Module not found" errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Database connection fails
```bash
# Check Supabase project status
supabase status

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

### Issue: Vercel deployment fails
```bash
# Check build logs in Vercel dashboard
# Common fix: ensure all environment variables are set
vercel env ls
```

### Issue: Stripe webhooks not working
1. Check webhook URL is correct in Stripe dashboard
2. Verify STRIPE_WEBHOOK_SECRET matches in Vercel
3. Check Vercel function logs for errors

## 📈 Next Steps After Basic Deployment

### Week 1: Production Readiness
- [ ] Set up custom domain
- [ ] Switch to Stripe live keys
- [ ] Configure production email service
- [ ] Set up monitoring and alerts
- [ ] Run full security audit

### Week 2: Performance Optimization
- [ ] Run performance tests
- [ ] Optimize database queries
- [ ] Set up CDN for images
- [ ] Implement caching strategies

### Week 3: Advanced Features
- [ ] Set up automated backups
- [ ] Implement error tracking (Sentry)
- [ ] Add analytics (Google Analytics)
- [ ] Set up uptime monitoring

## 🆘 Emergency Contacts and Resources

### If Things Go Wrong:
1. **Check Vercel Function Logs:** Vercel Dashboard → Functions → View Logs
2. **Check Supabase Logs:** Supabase Dashboard → Logs
3. **Check Stripe Webhook Logs:** Stripe Dashboard → Developers → Webhooks

### Documentation References:
- **Full Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Complete Testing Guide:** `TESTING_GUIDE.md`
- **Project Documentation:** `matex/docs/` folder

### Support Resources:
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **Next.js Docs:** https://nextjs.org/docs

## 🎯 Success Metrics

You'll know you're successful when:
- ✅ Your site loads at the Vercel URL
- ✅ Users can register and login
- ✅ Database operations work (check Supabase dashboard)
- ✅ No critical errors in Vercel logs
- ✅ Basic payment flow works (test mode)

## 💡 Pro Tips

1. **Start Small:** Get basic deployment working first, then add features
2. **Test Locally First:** Always test changes locally before deploying
3. **Use Test Mode:** Keep Stripe in test mode until you're ready for real payments
4. **Monitor Logs:** Check Vercel and Supabase logs regularly
5. **Backup Everything:** Keep backups of working configurations

## 🚨 Critical Security Notes

- **Never commit secrets:** Keep .env.local in .gitignore
- **Use strong passwords:** For database and admin accounts
- **Enable 2FA:** On all service accounts (Vercel, Supabase, Stripe)
- **Regular updates:** Keep dependencies updated
- **Monitor access:** Review who has access to your services

---

## Ready to Start?

1. **Right now:** Fix the package.json merge conflict
2. **Next 30 minutes:** Set up Supabase and get your keys
3. **Next hour:** Deploy to Vercel with basic configuration
4. **Next 2 hours:** Run through the testing checklist

**You've got this!** The MatEx platform is well-architected and ready for deployment. Follow this guide step-by-step, and you'll have a working production system today.

Need help? Check the detailed guides or review the existing documentation in the `matex/docs/` folder.
