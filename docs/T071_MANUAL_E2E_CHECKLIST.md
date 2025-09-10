# T071: Manual E2E Checklist

**Branch:** `qa/e2e-happy`  
**Commit:** `qa: document manual E2E flow`

## Overview

This document provides a comprehensive manual end-to-end testing checklist for the MatEx platform, covering the complete user journey from signup through fulfillment. This checklist ensures all critical user flows work correctly before production deployment.

## Prerequisites

- [ ] Development environment running locally
- [ ] Supabase database with all migrations applied
- [ ] Stripe test keys configured
- [ ] Email service configured (for notifications)
- [ ] Test data seeded (settings, KYC fields, notification templates)

## E2E Testing Checklist

### 1. User Registration & Authentication

#### Buyer Signup
- [ ] Navigate to `/signup`
- [ ] Fill registration form with valid buyer details
- [ ] Verify email confirmation sent
- [ ] Click email confirmation link
- [ ] Verify redirect to onboarding flow
- [ ] Complete buyer onboarding form with required KYC fields
- [ ] Upload required documents (ID, proof of address)
- [ ] Verify profile created with `kyc_status: 'pending'`
- [ ] Verify welcome notification received

#### Seller Signup
- [ ] Navigate to `/signup`
- [ ] Fill registration form with valid seller details
- [ ] Verify email confirmation sent
- [ ] Click email confirmation link
- [ ] Verify redirect to onboarding flow
- [ ] Complete seller onboarding form with business details
- [ ] Upload required documents (business license, tax info)
- [ ] Verify profile created with `kyc_status: 'pending'`
- [ ] Verify welcome notification received

### 2. KYC Approval Process

#### Admin KYC Review
- [ ] Login as admin user
- [ ] Navigate to `/admin/kyc`
- [ ] Review pending KYC submissions
- [ ] Verify document previews load correctly
- [ ] Approve buyer KYC with notes
- [ ] Approve seller KYC with notes
- [ ] Verify `kyc_status` updated to `'approved'`
- [ ] Verify approval notifications sent to users
- [ ] Verify audit log entries created

### 3. Terms & Conditions Acceptance

#### Terms Consent Flow
- [ ] Login as approved buyer
- [ ] Attempt to access restricted feature (bidding)
- [ ] Verify terms consent modal appears
- [ ] Read through terms content
- [ ] Accept latest terms version
- [ ] Verify `terms_acceptances` record created
- [ ] Verify access granted to restricted features

### 4. Listing Creation & Management

#### Create Fixed Price Listing
- [ ] Login as approved seller
- [ ] Navigate to `/sell/new`
- [ ] Fill listing form with complete details:
  - [ ] Title and description
  - [ ] Material type and condition
  - [ ] Quantity and unit
  - [ ] Select "Fixed Price" pricing type
  - [ ] Set price in CAD
  - [ ] Add location (city, province)
- [ ] Upload multiple listing images
- [ ] Verify image upload to Supabase Storage
- [ ] Submit listing
- [ ] Verify listing created with `status: 'active'`
- [ ] Verify listing appears in seller dashboard

#### Create Auction Listing
- [ ] Navigate to `/sell/new`
- [ ] Fill listing form with auction details:
  - [ ] Complete basic information
  - [ ] Select "Auction" pricing type
  - [ ] Set starting bid and buy-now price
  - [ ] Set auction duration
- [ ] Upload listing images
- [ ] Submit listing
- [ ] Verify auction record created with proper timing
- [ ] Verify listing appears in browse page

### 5. Inspection Slot Management

#### Seller: Add Inspection Slots
- [ ] Navigate to listing detail page as seller
- [ ] Access inspection management
- [ ] Add multiple inspection slots:
  - [ ] Different dates and times
  - [ ] Set capacity for each slot
  - [ ] Verify no time overlaps
- [ ] Save inspection slots
- [ ] Verify slots appear on listing detail page

### 6. Listing Discovery & Search

#### Browse Listings
- [ ] Navigate to `/browse`
- [ ] Verify listings grid displays correctly
- [ ] Test pagination functionality
- [ ] Apply various filters:
  - [ ] Material type filter
  - [ ] Price range filter
  - [ ] Location filter
  - [ ] Pricing type (fixed/auction)
- [ ] Verify URL parameters update with filters
- [ ] Clear filters and verify reset

#### Search Functionality
- [ ] Use search bar with material keywords
- [ ] Verify full-text search results
- [ ] Test search with partial matches
- [ ] Verify search highlighting in results
- [ ] Test empty search results handling

### 7. Listing Detail & Inspection Booking

#### View Listing Details
- [ ] Click on listing from browse page
- [ ] Verify all listing information displays:
  - [ ] Image gallery with navigation
  - [ ] Complete specifications
  - [ ] Seller information and reputation
  - [ ] Pricing information
  - [ ] Available inspection slots

#### Book Inspection (Buyer)
- [ ] Login as approved buyer
- [ ] Navigate to listing detail page
- [ ] Select available inspection slot
- [ ] Confirm booking
- [ ] Verify booking record created
- [ ] Verify confirmation notifications sent to buyer and seller
- [ ] Verify slot capacity decremented

### 8. Deposit Authorization

#### Authorize Auction Deposit
- [ ] Navigate to auction listing as buyer
- [ ] Verify deposit requirement displayed
- [ ] Click "Authorize Deposit" button
- [ ] Complete Stripe payment authorization
- [ ] Verify PaymentIntent created with `capture_method: 'manual'`
- [ ] Verify deposit status shows "Authorized"
- [ ] Verify bidding controls become enabled

### 9. Auction Bidding Process

#### Place Bids
- [ ] Verify minimum bid amount calculated correctly
- [ ] Place initial bid above minimum
- [ ] Verify bid recorded in database
- [ ] Verify real-time bid update in UI
- [ ] Login as second buyer and place higher bid
- [ ] Verify outbid notification sent to first buyer
- [ ] Test soft-close extension (bid near end time)
- [ ] Verify auction end time extended appropriately

#### Bid History & Real-time Updates
- [ ] Verify bid history displays correctly
- [ ] Test real-time updates with multiple browsers
- [ ] Verify optimistic UI updates on bid placement
- [ ] Verify bid validation (amount, auction status)

### 10. Auction Completion & Winner Determination

#### Auction End Processing
- [ ] Wait for auction to end naturally or trigger manually
- [ ] Verify cron job processes ended auction
- [ ] Verify winner determined correctly (highest bid)
- [ ] Verify order created for winning bid
- [ ] Verify winner deposit captured and applied
- [ ] Verify losing bidders' deposits refunded
- [ ] Verify auction winner notification sent

### 11. Fixed Price Purchase

#### Direct Purchase Flow
- [ ] Navigate to fixed price listing
- [ ] Click "Buy Now" button
- [ ] Verify redirect to Stripe Checkout
- [ ] Complete payment with test card
- [ ] Verify successful payment redirect
- [ ] Verify order created with `status: 'paid'`
- [ ] Verify payment confirmation notifications

### 12. Invoice Generation & Payment

#### Auction Winner Invoice
- [ ] Login as auction winner
- [ ] Navigate to order detail page
- [ ] Verify invoice shows:
  - [ ] Winning bid amount
  - [ ] Deposit deduction
  - [ ] Platform fees
  - [ ] Remaining balance due
- [ ] Pay remaining balance via Stripe
- [ ] Verify payment completion
- [ ] Verify order status updated to `'paid'`

### 13. Order Fulfillment

#### Seller Fulfillment Process
- [ ] Login as seller
- [ ] Navigate to orders dashboard
- [ ] View paid order details
- [ ] Mark order as fulfilled
- [ ] Add tracking information (if applicable)
- [ ] Verify order status updated to `'fulfilled'`
- [ ] Verify fulfillment notification sent to buyer

#### Buyer Order Tracking
- [ ] Login as buyer
- [ ] Navigate to order history
- [ ] View order status progression
- [ ] Verify all status updates visible
- [ ] Verify notification history

### 14. Notifications System

#### In-App Notifications
- [ ] Verify notification bell shows unread count
- [ ] Click notification bell to view dropdown
- [ ] Verify recent notifications display
- [ ] Mark notifications as read
- [ ] Navigate to full notifications page
- [ ] Verify pagination works correctly

#### Email Notifications
- [ ] Verify email notifications received for:
  - [ ] Account registration
  - [ ] KYC approval/rejection
  - [ ] Inspection booking confirmations
  - [ ] Bid notifications (placed, outbid)
  - [ ] Auction won/lost
  - [ ] Payment confirmations
  - [ ] Order status updates

### 15. Admin Functions

#### Settings Management
- [ ] Login as admin
- [ ] Navigate to `/admin/settings`
- [ ] Modify auction settings (soft close, increments)
- [ ] Update fee percentages
- [ ] Save changes and verify cache invalidation
- [ ] Verify settings reflected in user-facing features

#### User Management
- [ ] Review user profiles in admin panel
- [ ] Test KYC approval/rejection workflow
- [ ] Verify audit log entries for admin actions

#### Listings Moderation
- [ ] Review listings requiring moderation
- [ ] Approve/reject listings with reasons
- [ ] Verify status changes reflected immediately

### 16. Error Handling & Edge Cases

#### Form Validation
- [ ] Test all forms with invalid data
- [ ] Verify client-side validation messages
- [ ] Verify server-side validation responses
- [ ] Test file upload size/type restrictions

#### Payment Error Handling
- [ ] Test declined payment scenarios
- [ ] Verify graceful error handling
- [ ] Test webhook failure recovery

#### Auction Edge Cases
- [ ] Test bidding on expired auctions
- [ ] Test concurrent bidding scenarios
- [ ] Verify deposit requirements enforced

### 17. Performance & Accessibility

#### Page Load Performance
- [ ] Verify all pages load within acceptable time
- [ ] Test with slow network conditions
- [ ] Verify loading states and skeletons display

#### Accessibility Testing
- [ ] Navigate site using only keyboard
- [ ] Test with screen reader
- [ ] Verify proper ARIA labels and roles
- [ ] Check color contrast ratios
- [ ] Verify skip-to-content functionality

### 18. Mobile Responsiveness

#### Mobile Testing
- [ ] Test all flows on mobile devices
- [ ] Verify responsive design works correctly
- [ ] Test touch interactions (swipe, tap)
- [ ] Verify mobile-specific UI elements

## Test Data Cleanup

After completing the E2E test:
- [ ] Clean up test orders and payments
- [ ] Reset auction states if needed
- [ ] Clear test notifications
- [ ] Document any issues found during testing

## Success Criteria

✅ **Complete E2E Flow Successful**: A user can successfully complete the entire journey from signup through fulfillment without critical errors.

✅ **All Notifications Working**: Users receive appropriate notifications at each step of the process.

✅ **Payment Processing Functional**: Both fixed price and auction payments process correctly with proper fee handling.

✅ **Admin Functions Operational**: Administrative functions work correctly for user and content management.

✅ **Error Handling Robust**: The system gracefully handles edge cases and provides meaningful error messages.

## Notes

- This checklist should be executed before each major release
- Any failures should be documented with steps to reproduce
- Consider automating frequently tested scenarios
- Update checklist as new features are added to the platform

## Related Tasks

- T019: Auth wiring (server/client)
- T022: Terms consent gate
- T028: POST /api/auctions/[id]/bid
- T035: Authorize deposit
- T040: Stripe webhooks
- T043: Notification triggers
