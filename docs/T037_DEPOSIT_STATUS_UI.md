# T037 - Deposit Status UI Implementation

## Overview

T037 implements comprehensive UI components to display deposit authorization status and requirements for auction bidding. This includes badges, banners, and gating mechanisms to ensure users authorize deposits before bidding.

## Components Created

### 1. DepositStatusBadge.tsx

Main component for displaying deposit authorization status with multiple variants.

**Variants:**
- `DepositStatusBadge` (default) - Full badge with optional CTA button
- `DepositStatusBadgeCompact` - Compact version without CTA
- `DepositStatusWithCTA` - Full version with CTA button

**Usage:**
```tsx
import DepositStatusBadge, { DepositStatusBadgeCompact, DepositStatusWithCTA } from './DepositStatusBadge';

// Default usage
<DepositStatusBadge auctionId="auction-123" />

// Compact version for cards/lists
<DepositStatusBadgeCompact auctionId="auction-123" />

// With CTA for detail pages
<DepositStatusWithCTA 
  auctionId="auction-123" 
  onAuthorizeClick={() => openDepositModal()} 
/>
```

**States:**
- Loading: Shows spinner while checking status
- Error: Shows error icon if check fails
- Authorized: Green badge with checkmark and amount
- Required: Yellow badge with warning icon and optional CTA button

### 2. DepositRequirementBanner.tsx

Prominent banner component for displaying deposit requirements with dismiss functionality.

**Variants:**
- `DepositRequirementBanner` (default) - Full banner with detailed messaging
- `DepositRequirementBannerCompact` - Compact version for smaller spaces

**Usage:**
```tsx
import DepositRequirementBanner, { DepositRequirementBannerCompact } from './DepositRequirementBanner';

// Full banner
<DepositRequirementBanner 
  auctionId="auction-123"
  onAuthorizeClick={() => openDepositModal()}
  onDismiss={() => setBannerDismissed(true)}
/>

// Compact version
<DepositRequirementBannerCompact 
  auctionId="auction-123"
  onAuthorizeClick={() => openDepositModal()}
/>
```

**Features:**
- Displays estimated deposit amount
- Explains deposit authorization process
- Dismissible with user callback
- Auto-hides when deposit is authorized

### 3. BiddingGate.tsx

Comprehensive gating component that prevents bidding when deposit is not authorized.

**Usage:**
```tsx
import BiddingGate from './BiddingGate';

<BiddingGate auctionId="auction-123">
  <AuctionBiddingForm auction={auction} />
</BiddingGate>
```

**Features:**
- Authentication check - shows sign-in prompt if not authenticated
- Deposit authorization check - shows authorization UI if not authorized
- Modal integration for deposit authorization
- Only renders children when all requirements are met

**Hook Export:**
```tsx
import { useDepositStatus } from './BiddingGate';

const { depositStatus, loading, isAuthenticated, canBid, refresh } = useDepositStatus(auctionId);
```

### 4. AuctionDisplay.tsx

Comprehensive auction display component that integrates all deposit status UI components.

**Usage:**
```tsx
import { AuctionDisplay } from './AuctionDisplay';

<AuctionDisplay 
  auction={auctionData}
  currentUserId={user?.id}
  showDepositStatus={true}
  showBiddingForm={true}
/>
```

**Integration Points:**
- Header: Shows `DepositStatusWithCTA` for non-owners
- Banner: Shows `DepositRequirementBanner` when deposit required
- Bidding: Wraps bidding form with `BiddingGate`
- Owner view: Shows `DepositStatusBadgeCompact` for auction owners

### 5. AuctionBidHistory.tsx

Complementary component for displaying bid history with user identification.

**Usage:**
```tsx
import AuctionBidHistory, { AuctionBidHistoryCompact } from './AuctionBidHistory';

// Full version
<AuctionBidHistory 
  auctionId="auction-123"
  maxEntries={10}
  showBidderNames={false}
/>

// Compact version
<AuctionBidHistoryCompact auctionId="auction-123" />
```

## Integration Patterns

### 1. Auction Detail Page

```tsx
function AuctionDetailPage({ auctionId }: { auctionId: string }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Main auction display with integrated deposit UI */}
      <AuctionDisplay 
        auction={auction}
        currentUserId={user?.id}
        showDepositStatus={true}
        showBiddingForm={true}
      />
      
      {/* Bid history */}
      <AuctionBidHistory auctionId={auctionId} />
    </div>
  );
}
```

### 2. Auction Card/List View

```tsx
function AuctionCard({ auction }: { auction: Auction }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold">{auction.title}</h3>
        <DepositStatusBadgeCompact auctionId={auction.id} />
      </div>
      
      {/* Auction details */}
      <div className="space-y-2">
        <p className="text-gray-600">{auction.description}</p>
        <div className="flex justify-between items-center">
          <span className="font-bold text-green-600">
            ${auction.current_bid}
          </span>
          <span className="text-sm text-gray-500">
            {auction.time_remaining}
          </span>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom Bidding Interface

```tsx
function CustomBiddingInterface({ auctionId }: { auctionId: string }) {
  const { canBid, depositStatus, loading } = useDepositStatus(auctionId);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="space-y-4">
      {/* Show deposit requirement banner if needed */}
      {!canBid && (
        <DepositRequirementBanner 
          auctionId={auctionId}
          onAuthorizeClick={() => setShowDepositModal(true)}
        />
      )}
      
      {/* Bidding form with gate */}
      <BiddingGate auctionId={auctionId}>
        <CustomBiddingForm auctionId={auctionId} />
      </BiddingGate>
    </div>
  );
}
```

## API Dependencies

The components expect the following API endpoints to be available:

1. **GET /api/deposits/status?auction_id={id}**
   - Returns deposit authorization status
   - Used by all deposit status components

2. **GET /api/auctions/{id}/deposit-estimate**
   - Returns estimated deposit amount
   - Used by DepositRequirementBanner

3. **GET /api/auctions/{id}/bids?limit={n}**
   - Returns bid history
   - Used by AuctionBidHistory

## Styling

All components use Tailwind CSS classes and follow consistent design patterns:

- **Colors**: Green for authorized, Yellow for required, Red for errors, Blue for actions
- **Spacing**: Consistent padding and margins using Tailwind spacing scale
- **Typography**: Semantic font sizes and weights
- **States**: Loading spinners, error states, and empty states

## Accessibility

Components include proper accessibility features:

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly text
- Color contrast compliance

## Testing Considerations

When testing these components:

1. **Authentication States**: Test with authenticated and unauthenticated users
2. **Deposit States**: Test with authorized and unauthorized deposits
3. **Loading States**: Test API loading and error conditions
4. **Responsive Design**: Test on different screen sizes
5. **User Interactions**: Test button clicks, form submissions, and modal interactions

## Future Enhancements

Potential improvements for future iterations:

1. **Real-time Updates**: WebSocket integration for live deposit status updates
2. **Animations**: Smooth transitions between states
3. **Customization**: Theme support and custom styling options
4. **Internationalization**: Multi-language support
5. **Analytics
