# T047: Settings Editor UI

## Overview
Create an admin settings editor interface that provides a CRUD editor for auction, fees, legal, inspection, and notification settings. Include JSON editor with validation, save functionality, and cache invalidation.

## Implementation Details

### Settings Editor Page
Create the main admin settings editor interface.

```typescript
// src/app/admin/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Setting {
  key: string;
  value: any;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  category: 'auction' | 'fees' | 'legal' | 'inspection' | 'notifications' | 'system';
}

const SETTING_DEFINITIONS: Setting[] = [
  // Auction Settings
  {
    key: 'auction.soft_close_seconds',
    value: 120,
    description: 'Seconds to extend auction when bid placed near end',
    type: 'number',
    category: 'auction'
  },
  {
    key: 'auction.min_increment_strategy',
    value: 'fixed',
    description: 'Minimum bid increment strategy (fixed or percentage)',
    type: 'string',
    category: 'auction'
  },
  {
    key: 'auction.min_increment_value',
    value: 5,
    description: 'Minimum bid increment amount (CAD or percentage)',
    type: 'number',
    category: 'auction'
  },
  {
    key: 'auction.deposit_required',
    value: true,
    description: 'Whether deposits are required for bidding',
    type: 'boolean',
    category: 'auction'
  },
  {
    key: 'auction.deposit_percent',
    value: 0.1,
    description: 'Deposit percentage of current bid',
    type: 'number',
    category: 'auction'
  },
  
  // Fee Settings
  {
    key: 'fees.transaction_percent',
    value: 0.04,
    description: 'Platform transaction fee percentage',
    type: 'number',
    category: 'fees'
  },
  {
    key: 'fees.payout_delay_days',
    value: 7,
    description: 'Days to hold funds before payout',
    type: 'number',
    category: 'fees'
  },
  
  // Notification Settings
  {
    key: 'notifications.channels',
    value: ['inapp', 'email'],
    description: 'Available notification channels',
    type: 'array',
    category: 'notifications'
  },
  {
    key: 'notifications.digest_enabled',
    value: false,
    description: 'Enable email digest notifications',
    type: 'boolean',
    category: 'notifications'
  },
  
  // Inspection Settings
  {
    key: 'inspection.reminder_hours',
    value: 24,
    description: 'Hours before inspection to send reminder',
    type: 'number',
    category: 'inspection'
  },
  {
    key: 'inspection.max_slots_per_listing',
    value: 10,
    description: 'Maximum inspection slots per listing',
    type: 'number',
    category: 'inspection'
  },
  
  // Legal Settings
  {
    key: 'legal.terms_version',
    value: '1.0',
    description: 'Current terms and conditions version',
    type: 'string',
    category: 'legal'
  },
  {
    key: 'legal.privacy_version',
    value: '1.0',
    description: 'Current privacy policy version',
    type: 'string',
    category: 'legal'
  },
  
  // System Settings
  {
    key: 'system.maintenance_mode',
    value: false,
    description: 'Enable maintenance mode',
    type: 'boolean',
    category: 'system'
  }
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const keys = SETTING_DEFINITIONS.map(s => s.key).join(',');
      const response = await fetch(`/api/settings?keys=${keys}`);
      const data = await response.json();
      
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (key: string, currentValue: any) => {
    setEditingKey(key);
    setEditValue(typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : currentValue);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveSetting = async (key: string) => {
    setSaving(key);
    try {
      const setting = SETTING_DEFINITIONS.find(s => s.key === key);
      if (!setting) return;

      let processedValue = editValue;

      // Process value based on type
      switch (setting.type) {
        case 'number':
          processedValue = parseFloat(editValue);
          if (isNaN(processedValue)) {
            alert('Invalid number value');
            return;
          }
          break;
        case 'boolean':
          processedValue = editValue === 'true' || editValue === true;
          break;
        case 'json':
        case 'array':
          try {
            processedValue = JSON.parse(editValue);
          } catch (e) {
            alert('Invalid JSON format');
            return;
          }
          break;
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { [key]: processedValue }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save setting');
      }

      // Update local state
      setSettings(prev => ({ ...prev, [key]: processedValue }));
      setEditingKey(null);
      setEditValue('');
    } catch (error) {
      console.error('Failed to save setting:', error);
      alert('Failed to save setting. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const categories = ['all', ...Array.from(new Set(SETTING_DEFINITIONS.map(s => s.category)))];
  
  const filteredSettings = SETTING_DEFINITIONS.filter(setting => 
    selectedCategory === 'all' || setting.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings Management</h1>
        <p className="text-gray-600">Configure platform settings and behavior</p>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  selectedCategory === category
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Settings List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            {filteredSettings.map((setting) => {
              const currentValue = settings[setting.key] ?? setting.value;
              const isEditing = editingKey === setting.key;
              const isSaving = saving === setting.key;

              return (
                <div key={setting.key} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900">{setting.key}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          setting.category === 'auction' ? 'bg-blue-100 text-blue-800' :
                          setting.category === 'fees' ? 'bg-green-100 text-green-800' :
                          setting.category === 'notifications' ? 'bg-purple-100 text-purple-800' :
                          setting.category === 'inspection' ? 'bg-yellow-100 text-yellow-800' :
                          setting.category === 'legal' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {setting.category}
                        </span>
                      </div>
                      {setting.description && (
                        <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
                      )}
                      
                      <div className="mt-3">
                        {isEditing ? (
                          <div className="space-y-3">
                            {setting.type === 'json' || setting.type === 'array' ? (
                              <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                rows={6}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                                placeholder="Enter JSON..."
                              />
                            ) : setting.type === 'boolean' ? (
                              <select
                                value={editValue.toString()}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              >
                                <option value="true">True</option>
                                <option value="false">False</option>
                              </select>
                            ) : (
                              <input
                                type={setting.type === 'number' ? 'number' : 'text'}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                step={setting.type === 'number' ? 'any' : undefined}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                            )}
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => saveSetting(setting.key)}
                                disabled={isSaving}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                              >
                                <CheckIcon className="h-4 w-4 mr-1" />
                                {isSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={isSaving}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                              >
                                <XMarkIcon className="h-4 w-4 mr-1" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {typeof currentValue === 'object' 
                                  ? JSON.stringify(currentValue, null, 2)
                                  : String(currentValue)
                                }
                              </code>
                            </div>
                            <button
                              onClick={() => startEditing(setting.key, currentValue)}
                              className="ml-4 inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <PencilIcon className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Bulk Actions</h3>
          <div className="flex space-x-4">
            <button
              onClick={loadSettings}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh Settings
            </button>
            <button
              onClick={() => {
                if (confirm('This will clear the settings cache. Continue?')) {
                  fetch('/api/settings/cache', { method: 'DELETE' })
                    .then(() => alert('Cache cleared successfully'))
                    .catch(() => alert('Failed to clear cache'));
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Settings Cache Management API
Create an API endpoint to manage settings cache.

```typescript
// src/app/api/settings/cache/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';

// In-memory cache (in production, use Redis or similar)
const settingsCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin();

    // Clear the cache
    settingsCache.clear();

    return NextResponse.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin();

    // Return cache stats
    const cacheStats = {
      size: settingsCache.size,
      keys: Array.from(settingsCache.keys()),
      ttl: CACHE_TTL
    };

    return NextResponse.json({ cache: cacheStats });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}
```

### Enhanced Settings API
Update the settings API to include cache invalidation and admin-only POST access.

```typescript
// src/app/api/settings/route.ts (updated)
import { createClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';

// In-memory cache
const settingsCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keys = searchParams.get('keys')?.split(',') || [];

    if (keys.length === 0) {
      return NextResponse.json({ error: 'No keys specified' }, { status: 400 });
    }

    const supabase = createClient();
    const settings: Record<string, any> = {};
    const uncachedKeys: string[] = [];

    // Check cache first
    const now = Date.now();
    for (const key of keys) {
      const cached = settingsCache.get(key);
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        settings[key] = cached.value;
      } else {
        uncachedKeys.push(key);
      }
    }

    // Fetch uncached keys from database
    if (uncachedKeys.length > 0) {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', uncachedKeys);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Process and cache results
      for (const row of data || []) {
        const value = row.value;
        settings[row.key] = value;
        settingsCache.set(row.key, { value, timestamp: now });
      }
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { user } = await requireAdmin();

    const { settings } = await request.json();

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 });
    }

    const supabase = createClient();
    const updatedKeys: string[] = [];

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key,
          value,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error(`Failed to update setting ${key}:`, error);
        return NextResponse.json(
          { error: `Failed to update setting: ${key}` },
          { status: 500 }
        );
      }

      updatedKeys.push(key);
      
      // Invalidate cache for this key
      settingsCache.delete(key);
    }

    // Log the settings change in audit log
    await supabase
      .from('audit_log')
      .insert({
        actor_id: user.id,
        action: 'settings_updated',
        before: null, // Could fetch previous values if needed
        after: { updated_keys: updatedKeys, settings }
      });

    return NextResponse.json({ 
      success: true, 
      updated_keys: updatedKeys,
      message: `Updated ${updatedKeys.length} setting(s)`
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Settings Validation Helper
Create a helper to validate setting values.

```typescript
// src/lib/settings-validation.ts
export interface SettingDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  required?: boolean;
  min?: number;
  max?: number;
  enum?: string[];
  pattern?: RegExp;
}

export const SETTING_DEFINITIONS: Record<string, SettingDefinition> = {
  'auction.soft_close_seconds': {
    key: 'auction.soft_close_seconds',
    type: 'number',
    required: true,
    min: 0,
    max: 3600
  },
  'auction.min_increment_strategy': {
    key: 'auction.min_increment_strategy',
    type: 'string',
    required: true,
    enum: ['fixed', 'percentage']
  },
  'auction.min_increment_value': {
    key: 'auction.min_increment_value',
    type: 'number',
    required: true,
    min: 0
  },
  'auction.deposit_percent': {
    key: 'auction.deposit_percent',
    type: 'number',
    required: true,
    min: 0,
    max: 1
  },
  'fees.transaction_percent': {
    key: 'fees.transaction_percent',
    type: 'number',
    required: true,
    min: 0,
    max: 0.5
  },
  'legal.terms_version': {
    key: 'legal.terms_version',
    type: 'string',
    required: true,
    pattern: /^\d+\.\d+$/
  }
};

export function validateSetting(key: string, value: any): { valid: boolean; error?: string } {
  const definition = SETTING_DEFINITIONS[key];
  if (!definition) {
    return { valid: false, error: 'Unknown setting key' };
  }

  // Check required
  if (definition.required && (value === null || value === undefined)) {
    return { valid: false, error: 'Setting is required' };
  }

  // Type validation
  switch (definition.type) {
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, error: 'Value must be a number' };
      }
      if (definition.min !== undefined && value < definition.min) {
        return { valid: false, error: `Value must be at least ${definition.min}` };
      }
      if (definition.max !== undefined && value > definition.max) {
        return { valid: false, error: `Value must be at most ${definition.max}` };
      }
      break;

    case 'string':
      if (typeof value !== 'string') {
        return { valid: false, error: 'Value must be a string' };
      }
      if (definition.enum && !definition.enum.includes(value)) {
        return { valid: false, error: `Value must be one of: ${definition.enum.join(', ')}` };
      }
      if (definition.pattern && !definition.pattern.test(value)) {
        return { valid: false, error: 'Value does not match required pattern' };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return { valid: false, error: 'Value must be a boolean' };
      }
      break;

    case 'json':
    case 'array':
      if (typeof value !== 'object') {
        return { valid: false, error: 'Value must be a valid JSON object or array' };
      }
      if (definition.type === 'array' && !Array.isArray(value)) {
        return { valid: false, error: 'Value must be an array' };
      }
      break;
  }

  return { valid: true };
}
```

## Files Created/Modified

### New Files
- `src/app/admin/settings/page.tsx` - Admin settings editor interface
- `src/app/api/settings/cache/route.ts` - Settings cache management API
- `src/lib/settings-validation.ts` - Settings validation helpers

### Modified Files
- `src/app/api/settings/route.ts` - Enhanced with admin-only POST access and cache invalidation

## Dependencies
Add Heroicons for UI icons (already included in T046).

## Database Requirements
- Existing `app_settings` table from T011
- Existing `audit_log` table from T018
- Admin users with proper role permissions

## Success Metrics
- [ ] Admin can view all platform settings organized by category
- [ ] Settings can be edited with appropriate input types
- [ ] JSON settings have proper validation and formatting
- [ ] Settings changes are saved to database
- [ ] Cache is invalidated when settings are updated
- [ ] Audit log records all settings changes
- [ ] Settings validation prevents invalid values
- [ ] Bulk actions work correctly (refresh, clear cache)
- [ ] Mobile-responsive settings interface

## Testing Checklist
- [ ] Settings load correctly on page load
- [ ] Category filtering works properly
- [ ] Edit mode enables for each setting type
- [ ] Number inputs validate ranges correctly
- [ ] Boolean settings show dropdown with true/false
- [ ] JSON settings validate syntax before saving
- [ ] Save operation updates database and cache
- [ ] Cancel operation discards changes
- [ ] Cache clear functionality works
- [ ] Audit log entries are created for changes
- [ ] Non-admin users cannot access settings API
- [ ] Settings validation prevents invalid data
