# T059 - Price Trend Charts Implementation

## Overview
Complete price trend analytics system with historical winning bid aggregation, API endpoints, client-side charting, and comprehensive caching mechanisms.

## Database Schema

### Price Trends Table
```sql
CREATE TABLE price_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material VARCHAR(100) NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    avg_winning_bid_cad DECIMAL(10,2),
    median_winning_bid_cad DECIMAL(10,2),
    min_winning_bid_cad DECIMAL(10,2),
    max_winning_bid_cad DECIMAL(10,2),
    total_volume_kg DECIMAL(12,2),
    auction_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Features
- Weekly aggregation of auction data by material type
- Statistical calculations (avg, median, min, max prices)
- Volume tracking and auction count metrics
- Automatic data retention (2 years)
- Performance indexes for efficient querying

## Database Functions

### Data Aggregation
- `aggregate_price_data_for_week(material, week_start)` - Process specific material/week
- `aggregate_price_data_for_all_materials(week_start)` - Batch process all materials
- `get_price_trends(material, start_date, end_date, limit)` - Retrieve trend data
- `get_materials_with_price_data()` - List available materials
- `cleanup_old_price_trends()` - Remove data older than 2 years

### Security & Performance
- RLS policies for public read access and system-only writes
- Comprehensive indexes on material, week_start, and updated_at
- Automatic updated_at triggers
- Data validation constraints

## API Endpoints

### GET /api/price-trends
Retrieve price trend data with comprehensive filtering and caching.

#### Parameters
- `material` (required) - Material type to analyze
- `start_date` (optional) - Start date (YYYY-MM-DD format)
- `end_date` (optional) - End date (YYYY-MM-DD format)
- `limit` (optional) - Number of weeks to return (default: 52, max: 104)
- `materials=true` - Get list of available materials

#### Response Format
```json
{
  "success": true,
  "data": {
    "material": "Steel",
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-12-31",
      "limit": 52
    },
    "trends": [
      {
        "week_start": "2024-01-01",
        "week_end": "2024-01-07",
        "avg_price": 125.50,
        "median_price": 120.00,
        "min_price": 100.00,
        "max_price": 150.00,
        "volume_kg": 5000.00,
        "auction_count": 12
      }
    ],
    "statistics": {
      "total_weeks": 52,
      "avg_price": 125.50,
      "min_price": 100.00,
      "max_price": 200.00,
      "total_volume": 260000.00,
      "avg_weekly_volume": 5000.00,
      "total_auctions": 624
    }
  },
  "cached": false,
  "timestamp": "2024-09-04T22:47:00.000Z"
}
```

### POST /api/price-trends
Admin endpoint to trigger price data aggregation.

#### Request Body
```json
{
  "material": "Steel",        // Optional: specific material
  "week_start": "2024-01-01"  // Optional: specific week
}
```

## Caching System

### In-Memory Cache
- 15-minute TTL for optimal performance
- Automatic cache invalidation on data updates
- Intelligent cache key generation
- Periodic cleanup of expired entries
- Cache statistics for monitoring

### Cache Management
- `clearPriceTrendsCache()` - Clear all cached data
- `getPriceTrendsCacheStats()` - Get cache performance metrics
- Automatic cache busting on POST operations
- Smart cache key filtering for targeted invalidation

## Client-Side Chart Component

### PriceTrendChart Component
Comprehensive React component with multiple chart types and interactive controls.

#### Props
```typescript
interface PriceTrendChartProps {
  material?: string;           // Initial material selection
  startDate?: string;          // Initial start date
  endDate?: string;            // Initial end date
  limit?: number;              // Data point limit (default: 52)
  height?: number;             // Chart height (default: 400)
  showControls?: boolean;      // Show material/chart selectors
  chartType?: 'line' | 'area' | 'bar';  // Chart visualization type
  className?: string;          // Additional CSS classes
}
```

#### Features
- **Multiple Chart Types**: Line, Area, and Bar charts
- **Interactive Controls**: Material selector and chart type switcher
- **Real-time Data**: Automatic fetching and caching
- **Statistics Dashboard**: Key metrics with trend indicators
- **Responsive Design**: Mobile-friendly with adaptive layouts
- **Custom Tooltips**: Detailed hover information
- **Loading States**: Skeleton loading and error handling
- **Empty States**: User-friendly no-data messages

#### Usage Examples
```tsx
// Basic usage
<PriceTrendChart material="Steel" />

// Advanced usage with controls
<PriceTrendChart
  material="Aluminum"
  startDate="2024-01-01"
  endDate="2024-12-31"
  limit={26}
  height={500}
  showControls={true}
  chartType="area"
  className="my-custom-chart"
/>

// Embedded in dashboard
<PriceTrendChart
  showControls={false}
  height={300}
  chartType="line"
/>
```

## Chart Types

### Line Chart (Default)
- Best for showing price trends over time
- Displays both average and median prices
- Interactive data points with hover details
- Smooth trend lines with brand colors

### Area Chart
- Emphasizes volume and magnitude of changes
- Filled areas show price ranges visually
- Good for comparing multiple metrics
- Semi-transparent fills for layered data

### Bar Chart
- Discrete weekly data representation
- Clear comparison between time periods
- Good for highlighting specific weeks
- Rounded corners for modern appearance

## Statistics Dashboard

### Key Metrics
- **Average Price**: Mean price across all weeks with trend indicator
- **Price Range**: Min-max price spread for the period
- **Total Volume**: Cumulative material volume traded
- **Weekly Average Volume**: Mean weekly trading volume

### Trend Indicators
- Green arrow up: Price increase from first to last week
- Red arrow down: Price decrease from first to last week
- Percentage change calculation based on period endpoints

## Integration Points

### Dashboard Integration
```tsx
import PriceTrendChart from '@/components/PriceTrendChart';

// In dashboard component
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <PriceTrendChart material="Steel" height={400} />
  <PriceTrendChart material="Aluminum" height={400} />
</div>
```

### Material Detail Pages
```tsx
// Show trends for specific material
<PriceTrendChart
  material={listing.material}
  showControls={false}
  height={300}
  className="mt-6"
/>
```

### Admin Analytics
```tsx
// Full-featured chart for admin analysis
<PriceTrendChart
  showControls={true}
  height={600}
  limit={104} // 2 years of data
/>
```

## Performance Optimizations

### Caching Strategy
- **Client-side**: React state management with useEffect
- **Server-side**: 15-minute in-memory cache
- **Database**: Efficient indexes and aggregated data
- **Network**: Conditional requests with cache headers

### Data Loading
- **Lazy Loading**: Charts load data on demand
- **Skeleton States**: Smooth loading experience
- **Error Boundaries**: Graceful error handling
- **Progressive Enhancement**: Works without JavaScript

### Database Performance
- **Indexes**: Optimized for material and date queries
- **Aggregation**: Pre-calculated weekly summaries
- **Retention**: Automatic cleanup of old data
- **Partitioning**: Ready for large-scale data

## Monitoring & Analytics

### Cache Metrics
```typescript
// Get cache performance stats
const stats = getPriceTrendsCacheStats();
console.log({
  totalEntries: stats.total_entries,
  activeEntries: stats.active_entries,
  hitRate: stats.active_entries / stats.total_entries,
  memorySizeMB: stats.cache_size_mb
});
```

### API Monitoring
- Response times for trend queries
- Cache hit/miss ratios
- Error rates and types
- Data freshness metrics

## Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket integration for live data
- **Export Functionality**: CSV/PDF export of trend data
- **Comparison Mode**: Side-by-side material comparisons
- **Forecasting**: ML-based price predictions
- **Alerts**: Price threshold notifications

### Scalability Considerations
- **Database Sharding**: Partition by material type
- **CDN Caching**: Static chart images for performance
- **Background Jobs**: Automated data aggregation
- **API Rate Limiting**: Prevent abuse and ensure stability

## Testing

### Unit Tests
- Chart component rendering
- Data transformation logic
- Cache management functions
- API endpoint validation

### Integration Tests
- Database function execution
- API response formats
- Chart data binding
- Error handling flows

### Performance Tests
- Large dataset rendering
- Cache performance under load
- Database query optimization
- Memory usage monitoring

## Deployment Notes

### Environment Variables
No additional environment variables required. Uses existing Supabase configuration.

### Database Migration
Run migration `019_price_trends.sql` to create tables and functions.

### Dependencies
- `recharts`: Chart rendering library
- `@heroicons/react`: Icon components
- Existing project dependencies (React, Next.js, Supabase)

### Cron Jobs (Recommended)
Set up weekly cron job to aggregate price data:
```bash
# Every Monday at 2 AM
0 2 * * 1 curl -X POST https://your-domain.com/api/price-trends
```

## Security Considerations

### Data Access
- Public read access to aggregated price trends
- Admin-only access to aggregation triggers
- No sensitive user data exposed
- Rate limiting on API endpoints

### Input Validation
- Zod schema validation for all inputs
- SQL injection prevention
- XSS protection in chart tooltips
- CSRF protection on POST endpoints

## Troubleshooting

### Common Issues
1. **No Data Displayed**: Check if auctions have been completed and orders fulfilled
2. **Cache Issues**: Use `clearPriceTrendsCache()` to reset
3. **Performance**: Monitor database indexes and query performance
4. **Chart Rendering**: Verify recharts dependency installation

### Debug Tools
- API endpoint testing: `/api/price-trends?materials=true`
- Cache statistics: `getPriceTrendsCacheStats()`
- Database functions: Direct SQL execution in Supabase
- Browser DevTools: Network tab for API calls
