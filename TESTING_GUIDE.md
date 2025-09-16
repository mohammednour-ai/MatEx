# MatEx Testing Guide

## Overview

This guide provides comprehensive testing procedures for the MatEx platform, covering both development and production testing scenarios. It includes manual testing procedures, automated testing strategies, and performance testing guidelines.

## Testing Types

### 1. Development Testing
- Unit testing for individual components
- Integration testing for API endpoints
- Local end-to-end testing
- Database migration testing

### 2. Production Testing
- Smoke testing after deployment
- Full end-to-end user journeys
- Performance and load testing
- Security testing

### 3. Regression Testing
- Testing after code changes
- Database migration verification
- Third-party integration testing

## Development Environment Testing

### Prerequisites
```bash
# Ensure development environment is set up
cd matex
npm install

# Start development server
npm run dev

# Verify environment variables are set
# Check .env.local file exists with required variables
```

### Local Testing Checklist

#### Database Testing
- [ ] **Migration Testing**
  ```bash
  # Reset and re-run migrations
  supabase db reset
  supabase db push
  
  # Verify all tables created
  supabase db status
  ```

- [ ] **Seed Data Testing**
  ```bash
  # Run seed script
  node scripts/seed-settings.js
  
  # Verify settings in database
  # Check Supabase dashboard or run SQL query
  ```

- [ ] **RLS Policy Testing**
  - Create test users with different roles
  - Verify data access restrictions
  - Test admin vs regular user permissions

#### API Endpoint Testing
```bash
# Test settings API
curl http://localhost:3000/api/settings

# Test protected endpoints (should require auth)
curl http://localhost:3000/api/admin/settings

# Test webhook endpoint
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

#### Frontend Component Testing
- [ ] **Navigation Testing**
  - Test all menu links
  - Verify responsive navigation
  - Check mobile menu functionality

- [ ] **Form Testing**
  - Test all form validations
  - Verify error message display
  - Test successful form submissions

- [ ] **Authentication Flow**
  - Test user registration
  - Test login/logout
  - Test password reset
  - Verify protected route access

## Production Testing

### Smoke Testing (Post-Deployment)

#### Basic Functionality
```bash
# Test site accessibility
curl -I https://your-domain.com
# Expected: 200 OK

# Test API endpoints
curl https://your-domain.com/api/settings
# Expected: JSON response with settings

# Test health check (if implemented)
curl https://your-domain.com/api/health
# Expected: 200 OK with status
```

#### Database Connectivity
- [ ] Visit application homepage
- [ ] Attempt user registration
- [ ] Verify user created in Supabase dashboard
- [ ] Test login with created user

#### Payment Integration
- [ ] Test Stripe webhook endpoint accessibility
- [ ] Verify webhook secret configuration
- [ ] Test payment form loading (should show Stripe elements)

### End-to-End Testing Scenarios

#### Scenario 1: Complete Buyer Journey
1. **User Registration**
   - [ ] Navigate to `/signup`
   - [ ] Fill registration form (buyer role)
   - [ ] Verify email confirmation sent
   - [ ] Click confirmation link
   - [ ] Complete KYC onboarding
   - [ ] Upload required documents

2. **Browse and Search**
   - [ ] Navigate to `/browse`
   - [ ] Apply various filters
   - [ ] Use search functionality
   - [ ] View listing details

3. **Bidding Process**
   - [ ] Find auction listing
   - [ ] Authorize deposit (test mode)
   - [ ] Place bid
   - [ ] Verify real-time updates
   - [ ] Test outbid scenario

4. **Purchase Completion**
   - [ ] Win auction or buy fixed-price item
   - [ ] Complete payment process
   - [ ] Verify order creation
   - [ ] Check email notifications

#### Scenario 2: Complete Seller Journey
1. **Seller Registration**
   - [ ] Register as seller
   - [ ] Complete business KYC
   - [ ] Get admin approval

2. **Listing Creation**
   - [ ] Create fixed-price listing
   - [ ] Upload multiple images
   - [ ] Create auction listing
   - [ ] Set inspection slots

3. **Order Management**
   - [ ] Receive order notification
   - [ ] Mark order as fulfilled
   - [ ] Verify buyer notification

#### Scenario 3: Admin Functions
1. **User Management**
   - [ ] Login as admin
   - [ ] Review KYC submissions
   - [ ] Approve/reject KYC
   - [ ] Verify user notifications

2. **Content Management**
   - [ ] Moderate listings
   - [ ] Update app settings
   - [ ] Manage notification templates

### Performance Testing

#### Load Testing
```bash
# Install load testing tool
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'https://your-domain.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Browse listings"
    requests:
      - get:
          url: "/browse"
      - get:
          url: "/api/settings"
EOF

# Run load test
artillery run load-test.yml
```

#### Performance Benchmarks
- [ ] **Page Load Times**
  - Homepage: < 2 seconds
  - Browse page: < 3 seconds
  - Listing detail: < 2 seconds

- [ ] **API Response Times**
  - Settings API: < 500ms
  - Search API: < 1 second
  - Bid placement: < 2 seconds

- [ ] **Database Query Performance**
  - User lookup: < 100ms
  - Listing search: < 500ms
  - Bid history: < 300ms

### Security Testing

#### Authentication Security
- [ ] **Password Security**
  - Test weak password rejection
  - Verify password hashing
  - Test password reset security

- [ ] **Session Management**
  - Test session timeout
  - Verify secure cookie settings
  - Test concurrent session handling

#### API Security
```bash
# Test rate limiting
for i in {1..101}; do
  curl -w "%{http_code}\n" -o /dev/null -s https://your-domain.com/api/settings
done
# Should return 429 after rate limit exceeded

# Test SQL injection protection
curl "https://your-domain.com/api/listings?search='; DROP TABLE users; --"
# Should return safe results, not execute SQL

# Test unauthorized access
curl -H "Authorization: Bearer invalid-token" \
  https://your-domain.com/api/admin/settings
# Should return 401 Unauthorized
```

#### File Upload Security
- [ ] Test file size limits
- [ ] Test file type restrictions
- [ ] Test malicious file upload prevention
- [ ] Verify file storage permissions

### Browser Compatibility Testing

#### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

#### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari Mobile
- [ ] Samsung Internet
- [ ] Firefox Mobile

#### Testing Checklist per Browser
- [ ] User registration/login
- [ ] Form submissions
- [ ] File uploads
- [ ] Payment processing
- [ ] Real-time updates
- [ ] Responsive design

### Accessibility Testing

#### Automated Testing
```bash
# Install accessibility testing tool
npm install -g @axe-core/cli

# Run accessibility audit
axe https://your-domain.com --save results.json

# Review results
cat results.json
```

#### Manual Accessibility Testing
- [ ] **Keyboard Navigation**
  - Tab through all interactive elements
  - Test skip-to-content functionality
  - Verify focus indicators

- [ ] **Screen Reader Testing**
  - Test with NVDA/JAWS (Windows)
  - Test with VoiceOver (Mac)
  - Verify ARIA labels and roles

- [ ] **Visual Testing**
  - Test color contrast ratios
  - Test with high contrast mode
  - Verify text scaling (up to 200%)

### Mobile Testing

#### Responsive Design
- [ ] Test on various screen sizes
- [ ] Verify touch targets (minimum 44px)
- [ ] Test swipe gestures
- [ ] Check mobile navigation

#### Mobile-Specific Features
- [ ] Test camera access for document upload
- [ ] Verify mobile payment flows
- [ ] Test offline behavior
- [ ] Check app-like behavior (PWA features)

## Automated Testing Setup

### Unit Testing
```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Create test configuration
cat > jest.config.js << EOF
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
EOF

# Run tests
npm test
```

### Integration Testing
```bash
# Install Playwright for E2E testing
npm install --save-dev @playwright/test

# Create E2E test
mkdir -p tests/e2e
cat > tests/e2e/user-journey.spec.js << EOF
const { test, expect } = require('@playwright/test');

test('complete user registration', async ({ page }) => {
  await page.goto('/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/onboarding');
});
EOF

# Run E2E tests
npx playwright test
```

## Testing Data Management

### Test Data Setup
```sql
-- Create test users
INSERT INTO profiles (id, email, role, kyc_status) VALUES
('test-buyer-1', 'buyer@test.com', 'buyer', 'approved'),
('test-seller-1', 'seller@test.com', 'seller', 'approved'),
('test-admin-1', 'admin@test.com', 'admin', 'approved');

-- Create test listings
INSERT INTO listings (title, description, seller_id, status, pricing_type, price) VALUES
('Test Listing 1', 'Test description', 'test-seller-1', 'active', 'fixed', 100.00),
('Test Auction 1', 'Test auction', 'test-seller-1', 'active', 'auction', 50.00);
```

### Test Data Cleanup
```sql
-- Clean up test data after testing
DELETE FROM profiles WHERE email LIKE '%@test.com';
DELETE FROM listings WHERE title LIKE 'Test %';
DELETE FROM orders WHERE created_at > NOW() - INTERVAL '1 hour';
```

## Continuous Integration Testing

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm test
    
    - name: Run E2E tests
      run: npx playwright test
    
    - name: Run accessibility tests
      run: npm run test:a11y
```

## Testing Checklist Templates

### Pre-Release Testing Checklist
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security tests passed
- [ ] Accessibility compliance verified
- [ ] Browser compatibility confirmed
- [ ] Mobile responsiveness tested
- [ ] Database migrations tested
- [ ] Third-party integrations verified

### Post-Deployment Testing Checklist
- [ ] Smoke tests passed
- [ ] Critical user journeys working
- [ ] Payment processing functional
- [ ] Email notifications sending
- [ ] Admin functions accessible
- [ ] Monitoring and alerts active
- [ ] Performance within acceptable limits
- [ ] No critical errors in logs

## Troubleshooting Common Test Issues

### Database Connection Issues
```bash
# Check database connection
supabase status

# Reset database if needed
supabase db reset

# Re-run migrations
supabase db push
```

### Payment Testing Issues
- Use Stripe test cards: 4242424242424242 (success), 4000000000000002 (decline)
- Verify webhook endpoints are accessible
- Check webhook secret configuration

### Email Testing Issues
- Use email testing services (Mailtrap, MailHog)
- Check spam folders
- Verify SMTP configuration

## Testing Tools and Resources

### Recommended Tools
- **Unit Testing**: Jest, React Testing Library
- **E2E Testing**: Playwright, Cypress
- **Load Testing**: Artillery, k6
- **Accessibility**: axe-core, WAVE
- **Performance**: Lighthouse, WebPageTest
- **Security**: OWASP ZAP, Snyk

### Testing Environments
- **Local**: Full development environment
- **Staging**: Production-like environment for testing
- **Production**: Live environment (limited testing)

## Success Criteria

✅ **All Tests Passing**: Unit, integration, and E2E tests pass
✅ **Performance Targets Met**: Page loads and API responses within limits
✅ **Security Verified**: No critical security vulnerabilities
✅ **Accessibility Compliant**: WCAG 2.1 AA compliance achieved
✅ **Cross-Browser Compatible**: Works across all target browsers
✅ **Mobile Responsive**: Functions correctly on mobile devices

## Notes

- Run full test suite before each release
- Maintain test data separate from production data
- Document any test failures and resolutions
- Update tests when adding new features
- Regular security and performance testing recommended
- Keep testing documentation up to date
ca 