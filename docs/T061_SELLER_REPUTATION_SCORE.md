# T061: Seller Reputation Score Implementation

## Overview

This task implements a comprehensive seller reputation scoring system that computes reputation scores based on fulfillment time, disputes, and cancellations. The system provides visual badges on seller profiles to help buyers make informed decisions.

## Features Implemented

### 1. Database Schema (`021_seller_reputation.sql`)

**Tables:**
- `seller_reputation_scores`: Caches computed reputation scores with detailed metrics

**Functions:**
- `calculate_seller_reputation_score(seller_user_id UUID)`: Computes reputation score (0-5) based on order history
- `update_seller_reputation_score(seller_user_id UUID)`: Updates cached reputation score
- `get_seller_reputation(seller_user_id UUID)`: Gets reputation with auto-refresh if stale
- `refresh_all_seller_reputation_scores()`: Bulk refresh for admin/cron use

**Triggers:**
- Automatic reputation updates when order status changes

### 2. API Endpoints (`/api/reputation/[sellerId]`)

**GET /api/reputation/[sellerId]**
- Retrieves seller reputation score and details
- Auto-refreshes stale data (older than 1 hour)
- Returns default neutral score for new sellers
- Public endpoint with UUID validation

**POST /api/reputation/[sellerId]** (Admin Only)
- Forces immediate reputation score refresh
- Requires admin authentication
- Returns updated reputation data

### 3. UI Components (`SellerReputationBadge.tsx`)

**Features:**
- Visual reputation badges with color-coded levels
- Interactive tooltips with detailed metrics
- Multiple sizes (sm, md, lg)
- Loading and error states
- Optional detailed view
- Star rating display

**Badge Levels:**
- Excellent (4.5-5.0): Green with ⭐
- Very Good (4.0-4.4): Light green with ✨
- Good (3.5-3.9): Blue with 👍
- Fair (3.0-3.4): Yellow with ⚖️
- Poor (2.0-2.9): Orange with ⚠️
- Very Poor (0-1.9): Red with ❌

## Scoring Algorithm

The reputation score is calculated using the following formula:

**Base Score:** 5.0 points

**Penalties:**
1. **Fulfillment Rate Penalty** (0-1.5 points)
   - Based on percentage of orders fulfilled
   - Formula: `(1 - fulfillment_rate) * 1.5`

2. **Fulfillment Time Penalty** (0-1.0 points)
   - Applied if average fulfillment > 7 days
   - Formula: `min((avg_days - 7) / 14, 1.0)`

3. **Dispute Penalty** (0-2.0 points max)
   - 0.5 points per dispute
   - Formula: `min(dispute_count * 0.5, 2.0)`

4. **Cancellation Penalty** (0-1.5 points max)
   - 0.3 points per cancellation
   - Formula: `min(cancellation_count * 0.3, 1.5)`

**Final Score:** `max(0, min(5, base_score - total_penalties))`

## Usage Examples

### Basic Badge Usage

```tsx
import SellerReputationBadge from '@/components/SellerReputationBadge';

// Simple badge
<SellerReputationBadge sellerId="seller-uuid" />

// Small badge
<SellerReputationBadge 
  sellerId="seller-uuid" 
  size="sm" 
/>

// Badge with detailed view
<SellerReputationBadge 
  sellerId="seller-uuid" 
  showDetails={true}
  size="lg"
/>
```

### API Usage

```typescript
// Get seller reputation
const response = await fetch('/api/reputation/seller-uuid');
const reputation = await response.json();

// Admin: Force refresh
const refreshResponse = await fetch('/api/reputation/seller-uuid', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer admin-token' }
});
```

### Database Usage

```sql
-- Get reputation for a seller
SELECT * FROM get_seller_reputation('seller-uuid');

-- Manually update a seller's reputation
SELECT update_seller_reputation_score('seller-uuid');

-- Refresh all seller reputations (admin/cron)
SELECT refresh_all_seller_reputation_scores();
```

## API Response Format

```json
{
  "seller_id": "uuid",
  "score": 4.2,
  "total_orders": 25,
  "fulfilled_orders": 23,
  "fulfillment_rate": 92.0,
  "avg_fulfillment_days": 3.5,
  "dispute_count": 1,
  "cancellation_count": 1,
  "badge_level": "very-good",
  "last_calculated_at": "2024-01-15T10:30:00Z"
}
```

## Database Schema Details

### seller_reputation_scores Table

```sql
CREATE TABLE seller_reputation_scores (
  seller_id UUID PRIMARY KEY REFERENCES profiles(id),
  score NUMERIC(3,2) CHECK (score >= 0 AND score <= 5),
  total_orders INTEGER DEFAULT 0,
  fulfilled_orders INTEGER DEFAULT 0,
  avg_fulfillment_days NUMERIC(5,2),
  dispute_count INTEGER DEFAULT 0,
  cancellation_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

- **Public Read**: Anyone can read reputation scores
- **Admin Write**: Only admins can insert/update scores
- **Auto-refresh**: Scores refresh automatically when stale

## Performance Considerations

### Caching Strategy
- Reputation scores cached for 1 hour
- Automatic refresh on order status changes
- Bulk refresh available for admin operations

### Database Optimization
- Indexes on seller_id, score, and last_calculated_at
- Efficient aggregation queries
- Trigger-based updates for real-time accuracy

### Frontend Optimization
- Loading states for better UX
- Error handling with fallback display
- Tooltip positioning and responsive design

## Integration Points

### Seller Profiles
```tsx
// In seller profile component
<div className="seller-info">
  <h2>{seller.name}</h2>
  <SellerReputationBadge sellerId={seller.id} />
</div>
```

### Listing Cards
```tsx
// In listing grid component
<div className="listing-card">
  <h3>{listing.title}</h3>
  <SellerReputationBadge 
    sellerId={listing.seller_id} 
    size="sm" 
  />
</div>
```

### Admin Dashboard
```tsx
// Admin seller management
<SellerReputationBadge 
  sellerId={seller.id} 
  showDetails={true}
  size="lg"
/>
```

## Testing Scenarios

### Unit Tests
- Score calculation with various order histories
- Badge level determination
- API endpoint validation
- Component rendering states

### Integration Tests
- Order status change triggers
- Reputation refresh workflows
- Admin authentication
- Database function accuracy

### Manual Testing Checklist
- [ ] New seller shows neutral score (3.0)
- [ ] Score updates when orders are fulfilled
- [ ] Disputes and cancellations affect score
- [ ] Badge colors match score ranges
- [ ] Tooltips show correct information
- [ ] Admin can force refresh scores
- [ ] Loading and error states work
- [ ] Responsive design on mobile

## Security Considerations

### Data Protection
- UUID validation for seller IDs
- Admin-only refresh endpoints
- RLS policies for data access
- Input sanitization

### Performance Security
- Rate limiting on API endpoints
- Efficient database queries
- Cached responses to reduce load
- Proper error handling

## Maintenance

### Regular Tasks
- Monitor reputation score distribution
- Review scoring algorithm effectiveness
- Update badge thresholds if needed
- Clean up old reputation data

### Monitoring
- Track API response times
- Monitor database query performance
- Alert on reputation calculation errors
- Log admin refresh activities

## Future Enhancements

### Potential Improvements
- Machine learning-based scoring
- Customer review integration
- Time-weighted scoring (recent performance matters more)
- Industry-specific scoring adjustments
- Seller reputation trends over time

### Additional Features
- Reputation history tracking
- Comparative seller rankings
- Reputation-based search filtering
- Seller improvement recommendations

## Files Modified

1. **Database Migration**: `matex/supabase/migrations/021_seller_reputation.sql`
2. **API Route**: `matex/src/app/api/reputation/[sellerId]/route.ts`
3. **UI Component**: `matex/src/components/SellerReputationBadge.tsx`
4. **Icons**: `matex/src/components/Icons.tsx` (added StarIcon, InfoIcon)
5. **Documentation**: `matex/docs/T061_SELLER_REPUTATION_SCORE.md`

## Conclusion

The seller reputation system provides a comprehensive solution for evaluating seller performance based on objective metrics. The implementation includes robust database functions, efficient API endpoints, and user-friendly UI components that enhance the marketplace experience for both buyers and sellers.
