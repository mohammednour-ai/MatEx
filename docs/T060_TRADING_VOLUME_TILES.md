# T060 - Trading Volume Tiles Implementation

## Overview
Implementation of trading volume analytics dashboard with KPI tiles displaying key metrics including active auctions, weekly trading volume, new sellers, returning buyers, and other important business metrics.

## Database Schema

### Analytics Cache Table
```sql
-- Table: analytics_cache
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient cache lookups
CREATE INDEX idx_analytics_cache_key_expires ON analytics_cache(cache_key, expires_at);
```

### Database Functions

#### 1. get_dashboard_metrics()
Returns comprehensive dashboard metrics with 5-minute caching:
- Active auctions count
- Weekly trading volume
- New sellers count (this week)
- Returning buyers count (this week)
- Total materials count
- Average auction value
- Completion rate percentage

#### 2. get_active_auctions_count()
Returns the count of currently active auctions.

#### 3. get_weekly_trading_volume()
Calculates total trading volume for the current week.

#### 4. get_new_sellers_count()
Returns count of sellers who created their first auction this week.

#### 5. get_returning_buyers_count()
Returns count of buyers who have made multiple purchases this week.

#### 6. get_trading_volume_history(weeks_back INTEGER)
Returns historical trading volume data for the specified number of weeks.

#### 7. cache_dashboard_metrics(metrics JSONB)
Caches dashboard metrics with 5-minute TTL.

#### 8. clear_analytics_cache()
Clears all cached analytics data to force refresh.

## API Endpoints

### GET /api/analytics/dashboard
Retrieves dashboard metrics with optional historical data.

**Query Parameters:**
- `period` (optional): Number of weeks for historical data (1-52, default: 4)
- `history` (optional): Include historical data (true/false, default: false)

**Response:**
```json
{
  "metrics": {
    "active_auctions": 45,
    "weekly_trading_volume": 125000,
    "new_sellers_count": 12,
    "returning_buyers_count": 8,
    "total_materials": 156,
    "avg_auction_value": 2780,
    "completion_rate": 87.5,
    "last_updated": "2024-01-15T10:30:00Z"
  },
  "history": [
    {
      "week_start": "2024-01-08",
      "total_volume": 125000,
      "auction_count": 45,
      "avg_value": 2778,
      "unique_sellers": 23,
      "unique_buyers": 34
    }
  ],
  "period": 4,
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Caching:**
- 5-minute server-side cache
- HTTP cache headers for client-side caching

### POST /api/analytics/dashboard
Admin endpoint for cache management.

**Request Body:**
```json
{
  "action": "refresh_cache"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Analytics cache refreshed",
  "metrics": { /* fresh metrics */ },
  "refreshed_at": "2024-01-15T10:30:00Z"
}
```

## React Components

### DashboardKPITiles
Main dashboard component displaying KPI tiles with real-time data.

**Props:**
```typescript
interface DashboardKPITilesProps {
  period?: number;           // Historical data period (default: 4 weeks)
  includeHistory?: boolean;  // Include historical trends (default: false)
  autoRefresh?: boolean;     // Auto-refresh data (default: true)
  refreshInterval?: number;  // Refresh interval in ms (default: 5 minutes)
  className?: string;        // Additional CSS classes
}
```

**Features:**
- 8 KPI tiles with color-coded metrics
- Loading skeletons during data fetch
- Error handling with retry functionality
- Auto-refresh with configurable interval
- Manual refresh button
- Historical trends summary (optional)
- Responsive grid layout

**KPI Tiles:**
1. **Active Auctions** (Blue) - Current active auction count
2. **Weekly Trading Volume** (Green) - Total volume in USD
3. **New Sellers** (Purple) - First-time sellers this week
4. **Returning Buyers** (Orange) - Repeat buyers this week
5. **Total Materials** (Indigo) - Available material types
6. **Avg Auction Value** (Green) - Average auction value in USD
7. **Completion Rate** (Blue) - Auction completion percentage
8. **Period** (Red) - Current analysis period

### KPITile
Individual tile component for displaying metrics.

**Props:**
```typescript
interface KPITileProps {
  title: string;
  value: string | number;
  change?: number;           // Percentage change (optional)
  changeLabel?: string;      // Change period label (optional)
  icon: React.ReactNode;     // Icon component
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  loading?: boolean;         // Loading state
}
```

## Usage Examples

### Basic Dashboard
```tsx
import DashboardKPITiles from '@/components/DashboardKPITiles';

export default function DashboardPage() {
  return (
    <div className="p-6">
      <DashboardKPITiles />
    </div>
  );
}
```

### Dashboard with Historical Data
```tsx
import DashboardKPITiles from '@/components/DashboardKPITiles';

export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <DashboardKPITiles
        period={8}
        includeHistory={true}
        refreshInterval={2 * 60 * 1000} // 2 minutes
      />
    </div>
  );
}
```

### Custom Styling
```tsx
import DashboardKPITiles from '@/components/DashboardKPITiles';

export default function CustomDashboard() {
  return (
    <DashboardKPITiles
      className="max-w-7xl mx-auto"
      autoRefresh={false}
    />
  );
}
```

## Performance Optimizations

### Caching Strategy
- **Database Level**: 5-minute cache for expensive aggregation queries
- **API Level**: HTTP cache headers for client-side caching
- **Component Level**: In-memory state management with optimistic updates

### Database Optimizations
- Indexed cache table for fast lookups
- Efficient aggregation queries with proper indexes
- Automatic cache expiration and cleanup

### Frontend Optimizations
- Loading skeletons for better UX
- Error boundaries for graceful error handling
- Debounced refresh to prevent excessive API calls
- Responsive design for mobile compatibility

## Error Handling

### API Errors
- Comprehensive error responses with status codes
- Detailed error messages for debugging
- Graceful degradation for partial failures

### Component Errors
- Error state display with retry functionality
- Loading states during data fetching
- Fallback values for missing data

## Security Considerations

### API Security
- Input validation for all parameters
- Rate limiting on refresh endpoints
- Admin-only access for cache management

### Data Privacy
- No sensitive user data in cached metrics
- Aggregated data only for privacy protection

## Testing

### API Testing
```bash
# Test dashboard metrics endpoint
curl "http://localhost:3000/api/analytics/dashboard?period=4&history=true"

# Test cache refresh (admin only)
curl -X POST "http://localhost:3000/api/analytics/dashboard" \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh_cache"}'
```

### Component Testing
```tsx
import { render, screen } from '@testing-library/react';
import DashboardKPITiles from '@/components/DashboardKPITiles';

test('renders dashboard tiles', () => {
  render(<DashboardKPITiles />);
  expect(screen.getByText('Trading Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Active Auctions')).toBeInTheDocument();
});
```

## Migration Notes

### Database Migration
```sql
-- Run migration: 020_analytics_dashboard.sql
-- Creates analytics_cache table and all required functions
-- Includes proper indexes and RLS policies
```

### Deployment Checklist
- [ ] Run database migration
- [ ] Verify API endpoints are accessible
- [ ] Test dashboard component rendering
- [ ] Confirm caching is working properly
- [ ] Validate error handling scenarios

## Future Enhancements

### Planned Features
- Real-time updates via WebSocket
- Customizable KPI tile selection
- Export functionality for metrics
- Advanced filtering options
- Drill-down capabilities for detailed analysis

### Performance Improvements
- Redis caching for high-traffic scenarios
- Background job for metric pre-calculation
- CDN caching for static assets
- Database query optimization

## Troubleshooting

### Common Issues
1. **Slow Loading**: Check database indexes and cache hit rates
2. **Stale Data**: Verify cache expiration settings
3. **API Errors**: Check database connection and function definitions
4. **UI Issues**: Verify icon imports and Tailwind classes

### Debug Commands
```sql
-- Check cache status
SELECT cache_key, expires_at, created_at FROM analytics_cache;

-- Clear cache manually
SELECT clear_analytics_cache();

-- Test individual functions
SELECT get_active_auctions_count();
SELECT get_weekly_trading_volume();
```

## Implementation Status
- ✅ Database schema and functions
- ✅ API endpoints with caching
- ✅ React components with full functionality
- ✅ Error handling and loading states
- ✅ Responsive design
- ✅ Documentation and examples
