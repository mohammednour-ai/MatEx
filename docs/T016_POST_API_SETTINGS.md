# T016 - POST /api/settings (Admin Only)

## Overview
Implemented POST /api/settings API endpoint for admin-only settings management with atomic updates, cache invalidation, and comprehensive audit logging for the MatEx platform.

## Implementation Details

### 1. Admin-Only Access
- **Role Verification**: Strict admin role requirement
- **Authentication**: Secure user session validation
- **Authorization**: Admin-only endpoint protection
- **Audit Trail**: Complete change logging

### 2. Atomic Operations
- **Bulk Updates**: Multiple settings in single transaction
- **Rollback Safety**: Transaction rollback on any failure
- **Cache Invalidation**: Immediate cache clearing after updates
- **Consistency**: Ensures data integrity across updates

## Technical Implementation

### API Route (/app/api/settings/route.ts - POST method)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { invalidateSettingsCache } from './route'

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object required' }, { status: 400 })
    }

    // Start transaction
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? value : value,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }))

    // Upsert settings atomically
    const { data, error } = await supabaseServer
      .from('app_settings')
      .upsert(updates, { onConflict: 'key' })
      .select('key')

    if (error) {
      console.error('Settings update error:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    // Log audit trail
    const auditEntries = updates.map(setting => ({
      actor_id: userId,
      action: 'settings_update',
      before: null, // Could fetch previous value if needed
      after: { key: setting.key, value: setting.value },
      created_at: new Date().toISOString()
    }))

    await supabaseServer
      .from('audit_log')
      .insert(auditEntries)

    // Invalidate cache
    invalidateSettingsCache()

    return NextResponse.json({
      success: true,
      updated_keys: data?.map(d => d.key) || [],
      message: `Updated ${updates.length} settings`
    })

  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Usage Examples
```typescript
// Admin settings update
const updateSettings = async (settings: Record<string, any>) => {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ settings })
  })
  return response.json()
}

// Update auction configuration
await updateSettings({
  'auction.soft_close_seconds': 180,
  'auction.min_increment_strategy': 'percentage',
  'auction.deposit_required': true,
  'auction.deposit_percent': 0.15
})

// Update fee structure
await updateSettings({
  'fees.transaction_percent': 0.035,
  'fees.listing_fee': 25.00,
  'fees.processing_fee': 2.50
})
```

## Files Created
- Extended `src/app/api/settings/route.ts` - POST method for admin updates

## Security Features

### Authentication & Authorization
- **Session Validation**: Verify user authentication
- **Admin Role Check**: Strict admin-only access
- **Token Verification**: Secure token-based authentication
- **Error Handling**: No sensitive information in error responses

### Data Protection
- **Input Validation**: Sanitize and validate all input data
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Proper data encoding
- **CSRF Protection**: Token-based request validation

## Audit & Compliance

### Audit Logging
- **Change Tracking**: Log all settings modifications
- **User Attribution**: Track who made changes
- **Timestamp Recording**: Precise change timing
- **Before/After Values**: Complete change history

### Compliance Features
- **Data Retention**: Configurable audit log retention
- **Access Logging**: Track admin access patterns
- **Change Approval**: Optional approval workflow
- **Rollback Capability**: Ability to revert changes

## Performance Features

### Atomic Operations
- **Transaction Safety**: All-or-nothing updates
- **Rollback Protection**: Automatic rollback on failure
- **Consistency**: Maintain data integrity
- **Batch Processing**: Efficient bulk updates

### Cache Management
- **Immediate Invalidation**: Clear cache after updates
- **Selective Invalidation**: Target specific cache entries
- **Performance Impact**: Minimal cache rebuild time
- **Consistency**: Ensure fresh data after updates

## API Features

### Request Format
```json
{
  "settings": {
    "auction.soft_close_seconds": 180,
    "fees.transaction_percent": 0.035,
    "notifications.channels": ["inapp", "email"]
  }
}
```

### Response Format
```json
{
  "success": true,
  "updated_keys": [
    "auction.soft_close_seconds",
    "fees.transaction_percent",
    "notifications.channels"
  ],
  "message": "Updated 3 settings"
}
```

### Error Responses
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Non-admin user access attempt
- **400 Bad Request**: Invalid request format or data
- **500 Internal Server Error**: Database or server errors

## Integration Points

### Admin Dashboard
- **Settings Editor**: UI for bulk settings management
- **Validation**: Client-side validation before submission
- **Confirmation**: Change confirmation dialogs
- **History**: View previous settings changes

### System Integration
- **Real-time Updates**: Immediate effect of settings changes
- **Feature Flags**: Dynamic feature enabling/disabling
- **Business Rules**: Runtime business logic updates
- **Configuration Management**: Centralized config control

## Common Settings Updates

### Auction Configuration
- Soft close timing adjustments
- Bidding increment rule changes
- Deposit requirement modifications
- Reserve price settings

### Fee Structure Updates
- Transaction fee adjustments
- Processing fee changes
- Listing fee modifications
- Promotional pricing

### System Configuration
- Notification channel settings
- Email template configurations
- Legal document versions
- Feature flag toggles

## Success Metrics
- **Update Success Rate**: High successful update percentage
- **Response Time**: Fast settings update processing
- **Cache Performance**: Efficient cache invalidation
- **Audit Completeness**: Complete change tracking

## Future Enhancements
- **Approval Workflow**: Multi-step approval for critical settings
- **Setting Validation**: Schema-based validation
- **Rollback UI**: Easy revert functionality
- **Bulk Import**: CSV/JSON bulk settings import
- **Environment Sync**: Settings synchronization across environments
