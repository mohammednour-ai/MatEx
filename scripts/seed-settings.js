#!/usr/bin/env node

/**
 * Seed script for default application settings
 * This script populates the app_settings table with default configuration values
 * 
 * Usage:
 *   node scripts/seed-settings.js
 * 
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default settings to seed
const defaultSettings = [
  // Auction Settings
  {
    key: 'auction.soft_close_seconds',
    value: 300,
    description: 'Seconds to extend auction when bid placed near end',
    category: 'auction',
    is_public: true
  },
  {
    key: 'auction.min_increment_percentage',
    value: 5.0,
    description: 'Minimum bid increment as percentage of current bid',
    category: 'auction',
    is_public: true
  },
  {
    key: 'auction.max_duration_hours',
    value: 168,
    description: 'Maximum auction duration in hours (7 days)',
    category: 'auction',
    is_public: true
  },
  {
    key: 'auction.min_duration_hours',
    value: 24,
    description: 'Minimum auction duration in hours',
    category: 'auction',
    is_public: true
  },
  {
    key: 'auction.auto_extend_minutes',
    value: 5,
    description: 'Minutes to extend auction when bid placed near end',
    category: 'auction',
    is_public: true
  },

  // Fee Settings
  {
    key: 'fees.platform_fee_percentage',
    value: 3.5,
    description: 'Platform fee percentage on transactions',
    category: 'fees',
    is_public: false
  },
  {
    key: 'fees.payment_processing_percentage',
    value: 2.9,
    description: 'Payment processing fee percentage (Stripe)',
    category: 'fees',
    is_public: false
  },
  {
    key: 'fees.payment_processing_fixed_cents',
    value: 30,
    description: 'Fixed payment processing fee in cents',
    category: 'fees',
    is_public: false
  },
  {
    key: 'fees.minimum_transaction_cad',
    value: 10.00,
    description: 'Minimum transaction amount in CAD',
    category: 'fees',
    is_public: true
  },
  {
    key: 'fees.deposit_percentage',
    value: 10.0,
    description: 'Required deposit percentage for high-value items',
    category: 'fees',
    is_public: true
  },

  // Notification Settings
  {
    key: 'notifications.email_enabled',
    value: true,
    description: 'Enable email notifications',
    category: 'notifications',
    is_public: false
  },
  {
    key: 'notifications.sms_enabled',
    value: false,
    description: 'Enable SMS notifications',
    category: 'notifications',
    is_public: false
  },
  {
    key: 'notifications.push_enabled',
    value: true,
    description: 'Enable push notifications',
    category: 'notifications',
    is_public: false
  },
  {
    key: 'notifications.digest_frequency_hours',
    value: 24,
    description: 'Frequency of notification digest emails in hours',
    category: 'notifications',
    is_public: false
  },
  {
    key: 'notifications.cleanup_days',
    value: 90,
    description: 'Days to keep read notifications before cleanup',
    category: 'notifications',
    is_public: false
  },

  // Inspection Settings
  {
    key: 'inspections.default_duration_minutes',
    value: 60,
    description: 'Default inspection slot duration in minutes',
    category: 'inspections',
    is_public: true
  },
  {
    key: 'inspections.max_capacity_per_slot',
    value: 5,
    description: 'Maximum number of inspectors per slot',
    category: 'inspections',
    is_public: true
  },
  {
    key: 'inspections.advance_booking_hours',
    value: 24,
    description: 'Minimum hours in advance for booking inspections',
    category: 'inspections',
    is_public: true
  },
  {
    key: 'inspections.cancellation_hours',
    value: 12,
    description: 'Hours before inspection when cancellation is allowed',
    category: 'inspections',
    is_public: true
  },
  {
    key: 'inspections.reminder_hours',
    value: 2,
    description: 'Hours before inspection to send reminder',
    category: 'inspections',
    is_public: false
  },

  // Legal Settings
  {
    key: 'legal.terms_version',
    value: '1.0',
    description: 'Current terms of service version',
    category: 'legal',
    is_public: true
  },
  {
    key: 'legal.privacy_version',
    value: '1.0',
    description: 'Current privacy policy version',
    category: 'legal',
    is_public: true
  },
  {
    key: 'legal.cookie_consent_required',
    value: true,
    description: 'Require cookie consent banner',
    category: 'legal',
    is_public: true
  },
  {
    key: 'legal.age_verification_required',
    value: true,
    description: 'Require age verification for registration',
    category: 'legal',
    is_public: true
  },

  // System Settings
  {
    key: 'system.maintenance_mode',
    value: false,
    description: 'Enable maintenance mode',
    category: 'system',
    is_public: true
  },
  {
    key: 'system.registration_enabled',
    value: true,
    description: 'Allow new user registrations',
    category: 'system',
    is_public: true
  },
  {
    key: 'system.max_file_size_mb',
    value: 10,
    description: 'Maximum file upload size in MB',
    category: 'system',
    is_public: true
  },
  {
    key: 'system.supported_file_types',
    value: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    description: 'Supported file types for uploads',
    category: 'system',
    is_public: true
  },
  {
    key: 'system.session_timeout_minutes',
    value: 480,
    description: 'User session timeout in minutes (8 hours)',
    category: 'system',
    is_public: false
  },

  // Listing Settings
  {
    key: 'listings.max_images_per_listing',
    value: 10,
    description: 'Maximum number of images per listing',
    category: 'listings',
    is_public: true
  },
  {
    key: 'listings.featured_duration_days',
    value: 7,
    description: 'Duration for featured listings in days',
    category: 'listings',
    is_public: true
  },
  {
    key: 'listings.auto_expire_days',
    value: 30,
    description: 'Days after which inactive listings auto-expire',
    category: 'listings',
    is_public: true
  },
  {
    key: 'listings.min_description_length',
    value: 50,
    description: 'Minimum description length for listings',
    category: 'listings',
    is_public: true
  },

  // Search Settings
  {
    key: 'search.results_per_page',
    value: 20,
    description: 'Number of search results per page',
    category: 'search',
    is_public: true
  },
  {
    key: 'search.max_radius_km',
    value: 500,
    description: 'Maximum search radius in kilometers',
    category: 'search',
    is_public: true
  },
  {
    key: 'search.default_radius_km',
    value: 50,
    description: 'Default search radius in kilometers',
    category: 'search',
    is_public: true
  }
];

async function seedSettings() {
  console.log('🌱 Starting settings seed process...');
  console.log(`📊 Seeding ${defaultSettings.length} default settings`);

  try {
    // Use upsert to handle existing settings gracefully
    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        defaultSettings.map(setting => ({
          ...setting,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })),
        { 
          onConflict: 'key',
          ignoreDuplicates: false // Update existing settings
        }
      );

    if (error) {
      console.error('❌ Error seeding settings:', error);
      process.exit(1);
    }

    console.log('✅ Settings seeded successfully!');
    
    // Verify the seeded settings
    const { data: verifyData, error: verifyError } = await supabase
      .from('app_settings')
      .select('key, category, is_public')
      .order('category, key');

    if (verifyError) {
      console.error('❌ Error verifying settings:', verifyError);
      process.exit(1);
    }

    console.log('\n📋 Seeded settings summary:');
    const categoryCounts = {};
    verifyData.forEach(setting => {
      categoryCounts[setting.category] = (categoryCounts[setting.category] || 0) + 1;
    });

    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} settings`);
    });

    console.log(`\n🎉 Total settings in database: ${verifyData.length}`);
    console.log('🔧 Settings seed completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error during seeding:', error);
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedSettings();
}

module.exports = { seedSettings, defaultSettings };
