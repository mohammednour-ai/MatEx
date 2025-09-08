'use client';

import { useState, useEffect } from 'react';

interface Setting {
  key: string;
  value: any;
  category: string;
  description: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || {});
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
    setUnsavedChanges(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        setUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure platform behavior and preferences
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => fetchSettings()}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={!unsavedChanges || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-md hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Auction Settings */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">🔨 Auction Settings</h3>
          <p className="text-sm text-gray-500">Configure auction behavior and timing</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Soft Close Seconds
            </label>
            <input
              type="number"
              value={settings['auction.soft_close_seconds'] || 120}
              onChange={(e) => updateSetting('auction.soft_close_seconds', parseInt(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Increment Value (CAD)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings['auction.min_increment_value'] || 5}
              onChange={(e) => updateSetting('auction.min_increment_value', parseFloat(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Fee Settings */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">💰 Fee Configuration</h3>
          <p className="text-sm text-gray-500">Platform and transaction fees</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Fee Percentage
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={settings['fees.transaction_percent'] || 0.04}
              onChange={(e) => updateSetting('fees.transaction_percent', parseFloat(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Platform fee as percentage of transaction (0.04 = 4%)
            </p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">🔔 Notification Settings</h3>
          <p className="text-sm text-gray-500">Email and in-app notification preferences</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enabled Channels
            </label>
            <div className="space-y-2">
              {['inapp', 'email', 'sms'].map((channel) => (
                <label key={channel} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(settings['notifications.channels'] || ['inapp', 'email']).includes(channel)}
                    onChange={(e) => {
                      const channels = settings['notifications.channels'] || ['inapp', 'email'];
                      if (e.target.checked) {
                        updateSetting('notifications.channels', [...channels, channel]);
                      } else {
                        updateSetting('notifications.channels', channels.filter((c: string) => c !== channel));
                      }
                    }}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
