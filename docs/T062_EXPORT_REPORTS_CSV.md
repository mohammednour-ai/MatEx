# T062 - Export Reports CSV

## Overview
Implementation of comprehensive CSV export functionality for admin users to generate analytics and compliance reports with streamed response for performance optimization.

## Features Implemented

### API Endpoints
- **GET /api/admin/reports/export** - Generate and download CSV reports with filtering
- **POST /api/admin/reports/export** - Get available report types and filter options

### Report Types
1. **Price Trends** - Weekly aggregated price data by material type
2. **Trading Volume** - Detailed transaction data for completed orders
3. **Seller Performance** - Seller reputation scores and performance metrics
4. **Auction Summary** - Complete auction results with bidding activity

### Admin Interface
- **Report Configuration** - Interactive report type selection with visual cards
- **Date Range Filtering** - Start/end date inputs with validation
- **Material Filtering** - Optional material type selection
- **Export Options** - Include detailed information checkbox
- **Quick Actions** - Pre-configured export buttons for common reports
- **Real-time Preview** - Selected report parameters display

## Technical Implementation

### CSV Generation
```typescript
// CSV formatting utilities
function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCSVRow(row: any[]): string {
  return row.map(escapeCSVField).join(',') + '\n';
}
```

### Report Generation Functions
- **generatePriceTrendsReport()** - Weekly price aggregation from price_trends table
- **generateTradingVolumeReport()** - Order data with buyer/seller information
- **generateSellerPerformanceReport()** - Reputation scores and metrics
- **generateAuctionSummaryReport()** - Auction results with bid history

### Security Features
- **Admin Role Verification** - Only admin users can access export functionality
- **Rate Limiting** - 5 requests per minute per user to prevent abuse
- **Input Validation** - Zod schema validation for all parameters
- **SQL Injection Prevention** - Parameterized queries and input sanitization

### Performance Optimizations
- **Streamed Response** - Direct CSV streaming without memory buffering
- **Efficient Queries** - Optimized database queries with proper joins
- **Selective Data** - Only fetch required columns for each report type
- **Pagination Support** - Built-in support for large dataset handling

## Database Integration

### Tables Used
- **price_trends** - Weekly aggregated price data
- **orders** - Transaction and order information
- **listings** - Product and material details
- **profiles** - User and company information
- **seller_reputation_scores** - Performance metrics
- **auctions** - Auction details and timing
- **bids** - Bidding history and amounts

### Query Patterns
```sql
-- Price Trends Report
SELECT material, week_start, avg_price_cad, median_price_cad, 
       min_price_cad, max_price_cad, total_volume, auction_count
FROM price_trends
WHERE week_start >= $1 AND week_start <= $2
ORDER BY week_start DESC;

-- Trading Volume Report
SELECT o.id, o.type, l.material, l.title, l.quantity, o.total_cad,
       p.company_name, p.full_name, o.created_at
FROM orders o
JOIN listings l ON o.listing_id = l.id
JOIN profiles p ON o.buyer_id = p.id
WHERE o.status = 'fulfilled';
```

## User Interface

### Report Configuration
- **Visual Report Cards** - Icon-based selection with descriptions
- **Interactive Forms** - Real-time validation and feedback
- **Date Range Controls** - Min/max validation with business logic
- **Material Dropdown** - Dynamic population from database
- **Export Preview** - Selected parameters summary

### Export Process
1. **Report Selection** - Choose from 4 available report types
2. **Parameter Configuration** - Set date ranges and filters
3. **Validation** - Client and server-side validation
4. **Generation** - Server-side CSV generation with progress indication
5. **Download** - Automatic file download with proper filename

### Quick Actions
- **Last Week Prices** - Price trends for previous 7 days
- **Monthly Volume** - Trading volume for last 30 days
- **All Sellers** - Complete seller performance report

## Error Handling

### Validation Errors
- **Missing Report Type** - User-friendly error message
- **Invalid Date Range** - Automatic correction and warnings
- **Rate Limit Exceeded** - Clear feedback with retry timing

### Server Errors
- **Database Connection** - Graceful fallback with retry options
- **Query Failures** - Detailed error logging with user notification
- **Export Generation** - Progress tracking with failure recovery

## File Structure
```
matex/
├── src/app/api/admin/reports/export/route.ts    # Export API endpoint
├── src/app/admin/reports/page.tsx               # Admin interface
└── docs/T062_EXPORT_REPORTS_CSV.md             # Documentation
```

## Usage Examples

### API Usage
```typescript
// Get available report types
const response = await fetch('/api/admin/reports/export', {
  method: 'POST'
});
const { report_types, filters } = await response.json();

// Export price trends report
const params = new URLSearchParams({
  report_type: 'price_trends',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  material: 'Steel'
});

const exportResponse = await fetch(`/api/admin/reports/export?${params}`);
const blob = await exportResponse.blob();
```

### CSV Output Format
```csv
Material,Week Start,Average Price (CAD),Median Price (CAD),Min Price (CAD),Max Price (CAD),Total Volume,Auction Count,Last Updated
Steel,2024-01-01,1250.00,1200.00,800.00,1800.00,15000,12,2024-01-08T00:00:00Z
Aluminum,2024-01-01,850.00,825.00,600.00,1200.00,8500,8,2024-01-08T00:00:00Z
```

## Integration Points

### Admin Dashboard
- **Navigation Menu** - Reports section in admin sidebar
- **Permission Checking** - Admin role verification
- **Audit Logging** - All export actions logged for compliance

### Database Schema
- **Existing Tables** - Leverages current database structure
- **Performance Indexes** - Optimized queries for large datasets
- **Data Relationships** - Proper joins across related tables

## Testing Considerations

### Functional Testing
- **Report Generation** - Verify all report types generate correctly
- **Parameter Filtering** - Test date ranges and material filters
- **CSV Format** - Validate proper escaping and formatting
- **File Download** - Confirm browser download functionality

### Performance Testing
- **Large Datasets** - Test with substantial data volumes
- **Concurrent Users** - Multiple admin users exporting simultaneously
- **Memory Usage** - Streaming response memory efficiency
- **Query Performance** - Database query optimization validation

### Security Testing
- **Authentication** - Non-admin access prevention
- **Authorization** - Role-based access control
- **Input Validation** - SQL injection and XSS prevention
- **Rate Limiting** - Abuse prevention mechanisms

## Future Enhancements

### Additional Report Types
- **User Activity Reports** - Login and engagement metrics
- **Financial Reports** - Revenue and fee analysis
- **Compliance Reports** - KYC and legal document status
- **System Health Reports** - Performance and error metrics

### Export Formats
- **Excel (XLSX)** - Formatted spreadsheet export
- **PDF Reports** - Professional formatted documents
- **JSON Export** - API-friendly data format
- **Scheduled Exports** - Automated report generation

### Advanced Features
- **Report Templates** - Saved report configurations
- **Email Delivery** - Automated report distribution
- **Data Visualization** - Charts and graphs in exports
- **Custom Columns** - User-configurable field selection

## Deployment Notes

### Environment Variables
- No additional environment variables required
- Uses existing Supabase and authentication configuration

### Database Requirements
- Requires existing tables from previous tasks (T059-T061)
- No additional migrations needed
- Leverages existing indexes and relationships

### Performance Considerations
- **Memory Usage** - Streaming response minimizes server memory
- **Database Load** - Efficient queries with proper indexing
- **Network Transfer** - Compressed CSV responses
- **Concurrent Access** - Rate limiting prevents server overload

## Monitoring and Maintenance

### Metrics to Track
- **Export Frequency** - Number of reports generated per day
- **Report Types** - Most popular report types
- **File Sizes** - Average export file sizes
- **Error Rates** - Failed export attempts

### Maintenance Tasks
- **Log Cleanup** - Regular cleanup of export logs
- **Performance Monitoring** - Query performance tracking
- **Security Audits** - Regular access pattern review
- **Data Validation** - Periodic export accuracy verification
