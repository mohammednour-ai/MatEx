# T057 - Error/Empty States Implementation

## Overview
Complete implementation of error pages (404/500) and empty state components for listings, bids, notifications, and other UI scenarios with friendly, actionable copy.

## Files Created

### Error Pages
- `matex/src/app/not-found.tsx` - 404 page for missing resources
- `matex/src/app/error.tsx` - 500 page for server errors

### Empty State Components
- `matex/src/components/EmptyStates.tsx` - Comprehensive empty state components

## Features Implemented

### 404 Not Found Page
- **Professional Design**: Clean, centered layout with brand colors
- **Friendly Messaging**: Context-aware copy mentioning materials might be sold/moved
- **Multiple Actions**: 
  - Go to Homepage (primary CTA)
  - Browse Materials (secondary CTA)
  - Go Back (tertiary action)
- **Support Contact**: Direct email link to support@matex.ca
- **Responsive**: Mobile-first design with proper breakpoints

### 500 Server Error Page
- **Error Handling**: Client-side error boundary with reset functionality
- **Development Mode**: Shows error details and digest in development
- **User-Friendly**: Explains technical difficulties without technical jargon
- **Recovery Actions**:
  - Try Again (primary CTA with reset function)
  - Go to Homepage (fallback)
  - Browse Materials (alternative path)
- **Error Logging**: Automatic console logging for debugging

### Empty State Components

#### Base EmptyState Component
- **Consistent Design**: Reusable component with icon, title, description, and actions
- **Flexible Actions**: Support for primary and secondary actions (links or buttons)
- **Professional Styling**: Centered layout with proper spacing and typography

#### Listings Empty States
1. **EmptyListingsSearch**: No search results found
   - Clear filters action
   - Browse all materials fallback
2. **EmptyListingsBrowse**: No materials in marketplace
   - Encourages first listing creation
   - Links to how-it-works section
3. **EmptyMyListings**: User has no listings
   - Create first listing CTA
   - See examples from other sellers

#### Bids Empty States
1. **EmptyBidHistory**: No bids on auction
   - Encourages first bid placement
   - Smooth scroll to bidding form
2. **EmptyMyBids**: User hasn't placed bids
   - Browse auctions CTA
   - Learn about bidding process

#### Notifications Empty States
1. **EmptyNotifications**: No notifications
   - "All caught up" positive messaging
   - Link to notification settings
2. **EmptyNotificationsFiltered**: No filtered notifications
   - Show all notifications action
   - Dynamic tab switching

#### Inspections Empty States
1. **EmptyInspectionSlots**: No slots available
   - Contact seller action
   - Smooth scroll to seller contact
2. **EmptyMyInspections**: No upcoming inspections
   - Browse materials CTA
   - Learn about inspections

#### Additional Empty States
1. **EmptyOrders**: No purchase history
   - Start shopping CTA
2. **EmptySearchResults**: No search results with query
   - Clear search action
   - Browse all materials fallback
3. **EmptyGeneric**: Flexible empty state for any scenario

## Design Principles

### User Experience
- **Friendly Tone**: Conversational, helpful messaging
- **Clear Actions**: Always provide next steps
- **Context Awareness**: Tailored messages for specific scenarios
- **Visual Hierarchy**: Proper spacing and typography

### Accessibility
- **Semantic HTML**: Proper heading structure
- **Icon Usage**: Meaningful icons with proper sizing
- **Color Contrast**: Accessible color combinations
- **Keyboard Navigation**: Focusable interactive elements

### Brand Consistency
- **Color Palette**: Uses brand-500 for primary actions
- **Typography**: Consistent font weights and sizes
- **Spacing**: Tailwind spacing scale for consistency
- **Icons**: Heroicons for consistent iconography

## Usage Examples

### In Browse Page
```tsx
import { EmptyListingsSearch, EmptyListingsBrowse } from '@/components/EmptyStates';

// When no search results
if (listings.length === 0 && hasFilters) {
  return <EmptyListingsSearch />;
}

// When no listings at all
if (listings.length === 0) {
  return <EmptyListingsBrowse />;
}
```

### In Notifications Page
```tsx
import { EmptyNotifications, EmptyNotificationsFiltered } from '@/components/EmptyStates';

// When no notifications
if (notifications.length === 0 && filter === 'all') {
  return <EmptyNotifications />;
}

// When filtered view is empty
if (notifications.length === 0 && filter === 'unread') {
  return <EmptyNotificationsFiltered />;
}
```

### Custom Empty State
```tsx
import { EmptyGeneric } from '@/components/EmptyStates';

<EmptyGeneric
  title="No data available"
  description="Custom description for your specific use case."
  actionLabel="Custom Action"
  actionHref="/custom-path"
/>
```

## Technical Implementation

### Error Boundaries
- **Client-Side**: error.tsx handles runtime errors
- **Server-Side**: not-found.tsx handles 404 responses
- **Development**: Error details shown in development mode only

### Interactive Elements
- **Smooth Scrolling**: Actions that scroll to page elements
- **Dynamic Actions**: JavaScript-based interactions (clear search, tab switching)
- **Fallback Navigation**: Always provide alternative paths

### Performance
- **Lightweight**: Minimal JavaScript for interactive elements
- **Tree Shaking**: Individual component exports for optimal bundling
- **Static Assets**: Uses Heroicons for consistent, optimized icons

## Integration Points

### Existing Components
- **Browse Page**: Integrates with ListingsGrid component
- **Notifications**: Works with NotificationBell and notifications page
- **Admin Pages**: Can be used in admin interfaces for empty data states

### Future Enhancements
- **Animation**: Could add subtle animations for state transitions
- **Illustrations**: Could replace icons with custom illustrations
- **Personalization**: Could customize messages based on user role/history

## Testing Scenarios

### Error Pages
1. Navigate to non-existent URL → Should show 404 page
2. Trigger server error → Should show 500 page with reset option
3. Test responsive design on mobile devices
4. Verify all action buttons work correctly

### Empty States
1. Browse with no listings → Should show EmptyListingsBrowse
2. Search with no results → Should show EmptyListingsSearch
3. View notifications when none exist → Should show EmptyNotifications
4. Filter notifications with no matches → Should show EmptyNotificationsFiltered
5. Test all interactive actions (scrolling, navigation, etc.)

## Accessibility Compliance

### WCAG Guidelines
- **Color Contrast**: All text meets AA standards
- **Focus Management**: Proper focus indicators on interactive elements
- **Screen Readers**: Semantic HTML with proper heading structure
- **Keyboard Navigation**: All actions accessible via keyboard

### Testing
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Verify keyboard-only navigation
- Check color contrast ratios
- Validate HTML semantics

## Maintenance

### Content Updates
- All copy is centralized in component definitions
- Easy to update messaging without touching multiple files
- Consistent tone and voice across all empty states

### Component Evolution
- Base EmptyState component allows for easy styling updates
- Individual components can be enhanced independently
- New empty states can be added following established patterns

This implementation provides a comprehensive foundation for handling error scenarios and empty states throughout the MatEx platform with professional design, user-friendly messaging, and consistent brand experience.
