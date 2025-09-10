# T072 - Vercel Config

## Overview
Add vercel.json configuration and environment variable mapping for production deployment on Vercel platform.

## Implementation Details

### Vercel Configuration
- **Build Configuration**: Next.js framework with npm ci install and npm run build
- **Output Directory**: .next (standard Next.js build output)
- **Function Configuration**: 30-second timeout for API routes
- **Security Headers**: Comprehensive security headers for all routes
- **CORS Configuration**: API routes configured with proper CORS headers
- **Environment Variables**: Complete mapping of all required environment variables
- **Regional Deployment**: Configured for iad1 (US East) region
- **Cron Jobs**: Three scheduled cron jobs for automated maintenance

### Security Headers
- **X-Content-Type-Options**: nosniff - Prevents MIME type sniffing
- **X-Frame-Options**: DENY - Prevents clickjacking attacks
- **X-XSS-Protection**: 1; mode=block - Enables XSS filtering
- **Referrer-Policy**: strict-origin-when-cross-origin - Controls referrer information
- **Permissions-Policy**: Restricts camera, microphone, and geolocation access

### Environment Variable Mapping
- **Supabase**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- **Stripe**: STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- **Email**: EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
- **NextAuth**: NEXTAUTH_SECRET, NEXTAUTH_URL
- **Cron Jobs**: CRON_SECRET for secure cron job authentication

### Cron Jobs Configuration
- **Process Ended Auctions**: Runs every 5 minutes (*/5 * * * *) to process completed auctions
- **Inspection Reminders**: Runs every 6 hours (0 */6 * * *) to send inspection reminders
- **Cleanup Expired Notifications**: Runs daily at 2 AM (0 2 * * *) to clean up old data

## Files Changed
- Created `matex/vercel.json` - Main Vercel configuration file
- Created `matex/src/app/api/cron/process-ended-auctions/route.ts` - Cron job for auction processing
- Created `matex/src/app/api/cron/inspection-reminders/route.ts` - Cron job for inspection reminders
- Created `matex/src/app/api/cron/cleanup-expired-notifications/route.ts` - Cron job for data cleanup
- Updated `matex/.env.example` - Added CRON_SECRET environment variable

## Vercel Configuration Structure

### Build Settings
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "framework": "nextjs"
}
```

### Function Configuration
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Security Headers
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

### Environment Variables
```json
{
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "STRIPE_SECRET_KEY": "@stripe_secret_key"
  }
}
```

## Cron Job Implementation

### Process Ended Auctions
```typescript
// Runs every 5 minutes to process completed auctions
export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Find and process ended auctions
  // Create orders for winners
  // Mark auctions as completed
}
```

### Inspection Reminders
```typescript
// Runs every 6 hours to send inspection reminders
export async function GET(request: NextRequest) {
  // Get reminder settings from database
  // Find bookings needing reminders
  // Send notifications to buyers
  // Mark reminders as sent
}
```

### Cleanup Expired Data
```typescript
// Runs daily at 2 AM to clean up old data
export async function GET(request: NextRequest) {
  // Clean up old read notifications (90 days)
  // Clean up very old unread notifications (365 days)
  // Clean up expired audit logs (7 years)
  // Clean up old search logs (30 days)
}
```

## Deployment Configuration

### Regional Settings
- **Primary Region**: iad1 (US East - Virginia)
- **Function Timeout**: 30 seconds for all API routes
- **Build Output**: Standard Next.js .next directory

### Environment Variable Setup
1. Set up Vercel environment variables using the @ syntax for secrets
2. Configure all required environment variables in Vercel dashboard
3. Ensure CRON_SECRET is set for secure cron job authentication

### Security Configuration
- Comprehensive security headers for all routes
- CORS configuration for API endpoints
- Frame options set to DENY for clickjacking protection
- Content type options set to nosniff for MIME type security

## Testing Performed
- ✅ Vercel configuration file created with comprehensive settings
- ✅ All three cron job endpoints implemented with proper authentication
- ✅ Environment variable mapping configured for all required variables
- ✅ Security headers configured for production security
- ✅ CORS headers configured for API endpoint access
- ✅ Function timeout settings configured for API routes
- ✅ Regional deployment settings configured for optimal performance
- ✅ Cron job schedules configured for automated maintenance
- ✅ Environment variable template updated with CRON_SECRET
- ✅ TypeScript compilation successful with proper type definitions

## Production Deployment Steps
1. **Environment Variables**: Configure all environment variables in Vercel dashboard
2. **Domain Configuration**: Set up custom domain and SSL (covered in T075)
3. **Database Connection**: Ensure production Supabase connection (covered in T073)
4. **Stripe Webhooks**: Configure production webhook endpoints (covered in T074)
5. **Cron Jobs**: Verify cron job authentication with CRON_SECRET
6. **Security Headers**: Verify security headers are applied correctly
7. **Function Timeouts**: Monitor API route performance and adjust timeouts if needed

## Monitoring and Maintenance
- **Cron Job Logs**: Monitor cron job execution in Vercel dashboard
- **Function Performance**: Monitor API route performance and timeout issues
- **Security Headers**: Verify security headers are properly applied
- **Environment Variables**: Ensure all environment variables are properly configured
- **Regional Performance**: Monitor performance from iad1 region

## Future Enhancements
- **Multi-Region Deployment**: Consider additional regions for global performance
- **Advanced Caching**: Implement edge caching for static content
- **Function Optimization**: Optimize function cold start times
- **Monitoring Integration**: Add application performance monitoring
- **Error Tracking**: Implement comprehensive error tracking and alerting

## Notes
Complete Vercel configuration ready for production deployment with comprehensive security headers, environment variable mapping, automated cron jobs, and proper build configuration. Provides foundation for scalable production deployment with automated maintenance tasks.
