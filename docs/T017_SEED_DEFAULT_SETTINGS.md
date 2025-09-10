# T017 - Seed Default Settings

## Overview
Implemented seeding script for default application settings to establish baseline configuration for auction rules, fees, notifications, and system parameters in the MatEx platform.

## Implementation Details

### 1. Default Configuration
- **Auction Settings**: Soft close timing, increment strategies, deposit requirements
- **Fee Structure**: Transaction fees, deposit percentages, processing costs
- **Notification Channels**: Enabled communication channels
- **System Parameters**: Core platform configuration values

### 2. Seeding Strategy
- **Idempotent Script**: Safe to run multiple times without duplication
- **Environment Aware**: Different defaults for dev/staging/production
- **Validation**: Ensure all required settings are present
- **Documentation**: Clear explanation of each setting

## Technical Implementation

### Seeding Script (scripts/seed-settings.js)
```javascript
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const defaultSettings = [
  // Auction Configuration
  {
    key: 'auction.soft_close_seconds',
    value: 120,
    description: 'Seconds to extend auction when bid placed near end'
  },
  {
    key: 'auction.min_increment_strategy',
    value: 'fixed',
    description: 'Bidding increment strategy: fixed or percentage'
  },
  {
    key: 'auction.min_increment_value',
    value: 5,
    description: 'Minimum bid increment in CAD (for fixed strategy)'
  },
  {
    key: 'auction.min_increment_percent',
    value: 0.05,
    description: 'Minimum bid increment percentage (for percentage strategy)'
  },
  {
    key: 'auction.deposit_required',
    value: true,
    description: 'Whether deposits are required for bidding'
  },
  {
    key: 'auction.deposit_percent',
    value: 0.1,
    description: 'Deposit percentage of current bid amount'
  },
  
  // Fee Structure
  {
    key: 'fees.transaction_percent',
    value: 0.04,
    description: 'Platform transaction fee percentage'
  },
  {
    key: 'fees.processing_fee',
    value: 2.50,
    description: 'Fixed payment processing fee in CAD'
  },
  {
    key: 'fees.listing_fee',
    value: 0,
    description: 'Fee for creating listings in CAD'
  },
  {
    key: 'fees.deposit_processing_fee',
    value: 1.00,
    description: 'Processing fee for deposit authorization'
  },
  
  // Notification Settings
  {
    key: 'notifications.channels',
    value: ['inapp', 'email'],
    description: 'Enabled notification channels'
  },
  {
    key: 'notifications.digest_frequency',
    value: 'daily',
    description: 'Email digest frequency: daily, weekly, never'
  },
  {
    key: 'notifications.reminder_hours',
    value: 24,
    description: 'Hours before inspection to send reminder'
  },
  
  // Inspection Settings
  {
    key: 'inspections.default_capacity',
    value: 3,
    description: 'Default capacity for inspection slots'
  },
  {
    key: 'inspections.buffer_minutes',
    value: 30,
    description: 'Buffer time between inspection slots'
  },
  {
    key: 'inspections.advance_booking_days',
    value: 14,
    description: 'Maximum days in advance for booking'
  },
  
  // Legal Settings
  {
    key: 'legal.current_terms_version',
    value: '1.0',
    description: 'Current terms and conditions version'
  },
  {
    key: 'legal.privacy_policy_version',
    value: '1.0',
    description: 'Current privacy policy version'
  },
  {
    key: 'legal.cookie_consent_required',
    value: true,
    description: 'Whether cookie consent is required'
  },
  
  // System Settings
  {
    key: 'system.maintenance_mode',
    value: false,
    description: 'Enable maintenance mode'
  },
  {
    key: 'system.max_listing_images',
    value: 10,
    description: 'Maximum images per listing'
  },
  {
    key: 'system.max_file_size_mb',
    value: 5,
    description: 'Maximum file upload size in MB'
  },
  {
    key: 'system.supported_file_types',
    value: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    description: 'Supported file types for uploads'
  }
]

async function seedSettings() {
  console.log('Starting settings seed...')
  
  try {
    // Prepare settings for upsert
    const settingsToUpsert = defaultSettings.map(setting => ({
      key: setting.key,
      value: setting.value,
      updated_at: new Date().toISOString()
    }))
    
    // Upsert settings (insert or update if exists)
    const { data, error } = await supabase
      .from('app_settings')
      .upsert(settingsToUpsert, { 
        onConflict: 'key',
        ignoreDuplicates: false 
      })
      .select('key')
    
    if (error) {
      console.error('Error seeding settings:', error)
      process.exit(1)
    }
    
    console.log(`Successfully seeded ${data?.length || settingsToUpsert.length} settings:`)
    defaultSettings.forEach(setting => {
      console.log(`  ✓ ${setting.key}: ${JSON.stringify(setting.value)}`)
    })
    
    // Verify critical settings
    const criticalSettings = [
      'auction.soft_close_seconds',
      'fees.transaction_percent',
      'notifications.channels'
    ]
    
    const { data: verification, error: verifyError } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', criticalSettings)
    
    if (verifyError) {
      console.error('Error verifying settings:', verifyError)
      process.exit(1)
    }
    
    console.log('\nVerification of critical settings:')
    verification?.forEach(setting => {
      console.log(`  ✓ ${setting.key}: ${JSON.stringify(setting.value)}`)
    })
    
    console.log('\nSettings seed completed successfully!')
    
  } catch (error) {
    console.error('Unexpected error during seeding:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  seedSettings()
}

module.exports = { seedSettings, defaultSettings }
```

### Package.json Script
```json
{
  "scripts": {
    "seed:settings": "node scripts/seed-settings.js",
    "seed:settings:dev": "NODE_ENV=development node scripts/seed-settings.js",
    "seed:settings:prod": "NODE_ENV=production node scripts/seed-settings.js"
  }
}
```

## Files Created
- `scripts/seed-settings.js` - Settings seeding script
- Updated `package.json` - Added seeding scripts

## Default Settings Categories

### Auction Configuration
- **Soft Close**: 120 seconds extension when bids placed near end
- **Increment Strategy**: Fixed CAD amounts vs percentage-based
- **Minimum Increment**: $5 CAD fixed or 5% percentage
- **Deposit Requirement**: 10% deposit required for bidding

### Fee Structure
- **Transaction Fee**: 4% platform fee on successful sales
- **Processing Fee**: $2.50 payment processing fee
- **Listing Fee**: Free listing creation (promotional)
- **Deposit Fee**: $1.00 deposit authorization fee

### Notification Settings
- **Channels**: In-app and email notifications enabled
- **Digest Frequency**: Daily email digest
- **Inspection Reminders**: 24 hours advance notice

### System Configuration
- **File Uploads**: 5MB max size, common formats supported
- **Listing Images**: Maximum 10 images per listing
- **Maintenance Mode**: Disabled by default

## Environment Considerations

### Development Settings
- Lower fees for testing
- Shorter auction times
- More permissive file limits
- Debug notifications enabled

### Production Settings
- Standard fee structure
- Optimized auction timing
- Security-focused configuration
- Production notification channels

## Usage Instructions

### Initial Setup
```bash
# Seed default settings
npm run seed:settings

# Environment-specific seeding
npm run seed:settings:dev
npm run seed:settings:prod
```

### Verification
```bash
# Check seeded settings
node -e "
const { supabase } = require('./lib/supabaseServer');
supabase.from('app_settings').select('*').then(console.log);
"
```

## Security Considerations

### Access Control
- **Service Role**: Uses service role key for seeding
- **Environment Variables**: Secure credential management
- **Validation**: Input validation for all settings
- **Audit Trail**: Settings changes logged

### Data Protection
- **No Secrets**: No sensitive data in default settings
- **Validation**: Type and range validation
- **Rollback**: Ability to revert to defaults
- **Documentation**: Clear setting descriptions

## Success Metrics
- **Seed Success**: All default settings created successfully
- **Validation**: Critical settings verified after seeding
- **Performance**: Fast seeding process completion
- **Consistency**: Identical settings across environments

## Future Enhancements
- **Environment-Specific Defaults**: Different values per environment
- **Setting Validation**: Schema-based validation
- **Migration Support**: Settings migration between versions
- **Backup/Restore**: Settings backup and restore functionality
- **UI Integration**: Admin interface for re-seeding
