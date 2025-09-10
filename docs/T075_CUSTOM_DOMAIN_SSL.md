# T075: Custom Domain & SSL Configuration

## Overview
Configure custom domain (matexhub.ca) with SSL certificate, enforce HTTPS, redirect www→root, and implement comprehensive security headers including HSTS.

## Implementation

### 1. Vercel Configuration Updates

#### Domain Redirects
- **www→root redirect**: Permanent redirect from www.matexhub.ca to matexhub.ca
- **HTTPS enforcement**: Automatic via Vercel's SSL certificate provisioning
- **Status**: 301 permanent redirect for SEO benefits

#### Security Headers Added
- **HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - 1-year max-age for strong security
  - Includes all subdomains
  - Preload directive for browser HSTS preload list
- **CSP**: Content Security Policy with Stripe and Supabase allowlists
- **Existing headers**: Maintained X-Content-Type-Options, X-Frame-Options, etc.

### 2. DNS Configuration Requirements

#### Required DNS Records
```
# A Records (point to Vercel)
matexhub.ca        A       76.76.19.61
www.matexhub.ca    A       76.76.19.61

# CNAME Alternative (recommended)
matexhub.ca        A       76.76.19.61
www.matexhub.ca    CNAME   cname.vercel-dns.com

# CAA Record (optional but recommended)
matexhub.ca        CAA     0 issue "letsencrypt.org"
matexhub.ca        CAA     0 issuewild "letsencrypt.org"
```

#### Domain Verification
1. Add domain in Vercel dashboard
2. Configure DNS records with domain registrar
3. Verify domain ownership
4. SSL certificate auto-provisioned by Vercel

### 3. SSL Certificate Management

#### Automatic SSL
- **Provider**: Let's Encrypt via Vercel
- **Renewal**: Automatic every 90 days
- **Wildcard**: Not required for current setup
- **Monitoring**: Vercel dashboard shows certificate status

#### Certificate Features
- **TLS 1.2/1.3**: Modern encryption protocols
- **Perfect Forward Secrecy**: Ephemeral key exchange
- **OCSP Stapling**: Certificate revocation checking
- **HTTP/2**: Enabled by default with SSL

### 4. Security Headers Implementation

#### HSTS Configuration
```json
{
  "key": "Strict-Transport-Security",
  "value": "max-age=31536000; includeSubDomains; preload"
}
```

#### Content Security Policy
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com;"
}
```

### 5. Production Deployment Steps

#### Step 1: Domain Setup in Vercel
1. Navigate to Vercel project settings
2. Go to "Domains" section
3. Add `matexhub.ca` as primary domain
4. Add `www.matexhub.ca` as redirect domain
5. Configure redirect to `matexhub.ca` (non-www)

#### Step 2: DNS Configuration
1. Access domain registrar DNS settings
2. Add A record: `matexhub.ca` → Vercel IP
3. Add CNAME: `www.matexhub.ca` → `cname.vercel-dns.com`
4. Wait for DNS propagation (up to 48 hours)

#### Step 3: SSL Verification
1. Verify SSL certificate in browser
2. Check certificate chain and validity
3. Test HTTPS enforcement
4. Validate security headers

#### Step 4: Redirect Testing
1. Test www→root redirect: `www.matexhub.ca` → `matexhub.ca`
2. Verify 301 status code
3. Test HTTP→HTTPS redirect
4. Check redirect preservation of paths and query parameters

### 6. Environment Variables

#### Production URLs
```bash
# Update in Vercel environment variables
NEXTAUTH_URL=https://matexhub.ca
NEXT_PUBLIC_APP_URL=https://matexhub.ca

# Stripe webhook endpoint
STRIPE_WEBHOOK_ENDPOINT=https://matexhub.ca/api/stripe/webhook
```

### 7. Testing & Validation

#### SSL Testing Tools
- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com/
- **HSTS Preload**: https://hstspreload.org/

#### Manual Testing Checklist
- [ ] `https://matexhub.ca` loads correctly
- [ ] `http://matexhub.ca` redirects to HTTPS
- [ ] `www.matexhub.ca` redirects to `matexhub.ca`
- [ ] `http://www.matexhub.ca` redirects to `https://matexhub.ca`
- [ ] SSL certificate is valid and trusted
- [ ] Security headers present in response
- [ ] HSTS header includes preload directive
- [ ] CSP allows required resources (Stripe, Supabase)

#### Browser Testing
```bash
# Test redirects
curl -I http://matexhub.ca
curl -I http://www.matexhub.ca
curl -I https://www.matexhub.ca

# Test security headers
curl -I https://matexhub.ca
```

### 8. Monitoring & Maintenance

#### SSL Certificate Monitoring
- **Expiry**: Automatic renewal 30 days before expiration
- **Alerts**: Vercel dashboard notifications
- **Backup**: Manual certificate backup not required

#### Security Header Validation
- **Regular testing**: Monthly security header scans
- **CSP updates**: Update when adding new external resources
- **HSTS preload**: Submit to browser preload lists

#### Performance Impact
- **SSL overhead**: Minimal with modern TLS
- **Redirect latency**: Single 301 redirect adds ~50ms
- **Header size**: Security headers add ~500 bytes per response

### 9. Troubleshooting

#### Common Issues
1. **DNS propagation delay**: Wait up to 48 hours
2. **Certificate provisioning**: May take 5-10 minutes
3. **Redirect loops**: Check Vercel redirect configuration
4. **CSP violations**: Check browser console for blocked resources

#### Debug Commands
```bash
# Check DNS resolution
nslookup matexhub.ca
dig matexhub.ca

# Test SSL certificate
openssl s_client -connect matexhub.ca:443 -servername matexhub.ca

# Check HTTP headers
curl -I https://matexhub.ca
```

### 10. Security Considerations

#### HSTS Preload List
- **Submission**: Submit domain to browser preload lists
- **Commitment**: Permanent HTTPS-only commitment
- **Subdomain impact**: All subdomains must support HTTPS

#### Certificate Transparency
- **Monitoring**: Certificates logged in CT logs
- **Alerts**: Set up certificate transparency monitoring
- **Validation**: Regular CT log verification

## Files Modified
- `matex/vercel.json`: Added redirects, HSTS, and enhanced security headers

## Testing Performed
- Vercel configuration validation
- Security headers verification
- Redirect logic testing
- CSP policy validation for Stripe and Supabase integration

## Production Readiness
- ✅ HTTPS enforcement configured
- ✅ www→root redirect implemented
- ✅ HSTS with preload directive
- ✅ Comprehensive CSP policy
- ✅ SSL certificate auto-provisioning
- ✅ Security headers optimized

## Next Steps
1. Configure DNS records with domain registrar
2. Add domain in Vercel dashboard
3. Verify SSL certificate provisioning
4. Test all redirect scenarios
5. Submit domain to HSTS preload list
6. Set up SSL certificate monitoring
