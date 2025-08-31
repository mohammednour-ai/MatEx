'use client';

import React, { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

interface InspectionSlot {
  id: string;
  listing_id: string;
  slot_at: string;
  capacity: number;
  duration_minutes: number;
  location_address?: string;
  location_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bookings_count: number;
  available_capacity: number;
}

interface InspectionSlotManagerProps {
  listingId: string;
  isOwner: boolean;
}

interface InspectionSettings {
  default_duration_minutes: number;
  max_slots_per_listing: number;
  min_buffer_minutes: number;
  max_advance_days: number;
}

export default function InspectionSlotManager({ listingId, isOwner }: InspectionSlotManagerProps) {
  const [slots, setSlots] = useState<InspectionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<InspectionSlot | null>(null);
  const [settings, setSettings] = useState<InspectionSettings | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    slot_at: '',
    capacity: 5,
    duration_minutes: 60,
    location_address: '',
    location_notes: ''
  });

  // Load inspection settings
  useEffect(() => {
    loadInspectionSettings();
  }, []);

  // Load inspection slots
  useEffect(() => {
    if (listingId) {
      loadInspectionSlots();
    }
  }, [listingId]);

  const loadInspectionSettings = async () => {
    try {
      const response = await fetch('/api/settings?keys=inspections.default_duration_minutes,inspections.max_slots_per_listing,inspections.min_buffer_minutes,inspections.max_advance_days');
      const result = await response.json();
      
      if (result.success) {
        setSettings({
          default_duration_minutes: result.data['inspections.default_duration_minutes']?.value || 60,
          max_slots_per_listing: result.data['inspections.max_slots_per_listing']?.value || 10,
          min_buffer_minutes: result.data['inspections.min_buffer_minutes']?.value || 30,
          max_advance_days: result.data['inspections.max_advance_days']?.value || 30
        });
        
        // Set default duration in form
        setFormData(prev => ({
          ...prev,
          duration_minutes: result.data['inspections.default_duration_minutes']?.value || 60
        }));
      }
    } catch (error) {
      console.error('Error loading inspection settings:', error);
    }
  };

  const loadInspectionSlots = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inspections?listing_id=${listingId}`);
      const result = await response.json();
      
      if (result.success) {
        setSlots(result.data || []);
      } else {
        setError(result.error || 'Failed to load inspection slots');
      }
    } catch (error) {
      console.error('Error loading inspection slots:', error);
      setError('Failed to load inspection slots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listing_id: listingId,
          ...formData
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSlots(prev => [...prev, result.data]);
        setShowCreateForm(false);
        resetForm();
      } else {
        setError(result.error || 'Failed to create inspection slot');
      }
    } catch (error) {
      console.error('Error creating inspection slot:', error);
      setError('Failed to create inspection slot');
    }
  };

  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSlot) return;
    
    try {
      const response = await fetch(`/api/inspections/${editingSlot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSlots(prev => prev.map(slot => 
          slot.id === editingSlot.id ? result.data : slot
        ));
        setEditingSlot(null);
        resetForm();
      } else {
        setError(result.error || 'Failed to update inspection slot');
      }
    } catch (error) {
      console.error('Error updating inspection slot:', error);
      setError('Failed to update inspection slot');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this inspection slot?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/inspections/${slotId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSlots(prev => prev.filter(slot => slot.id !== slotId));
      } else {
        setError(result.error || 'Failed to delete inspection slot');
      }
    } catch (error) {
      console.error('Error deleting inspection slot:', error);
      setError('Failed to delete inspection slot');
    }
  };

  const startEditing = (slot: InspectionSlot) => {
    setEditingSlot(slot);
    setFormData({
      slot_at: new Date(slot.slot_at).toISOString().slice(0, 16),
      capacity: slot.capacity,
      duration_minutes: slot.duration_minutes,
      location_address: slot.location_address || '',
      location_notes: slot.location_notes || ''
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      slot_at: '',
      capacity: 5,
      duration_minutes: settings?.default_duration_minutes || 60,
      location_address: '',
      location_notes: ''
    });
    setEditingSlot(null);
    setShowCreateForm(false);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + (settings?.min_buffer_minutes || 30));
    return now.toISOString().slice(0, 16);
  };

  const getMaxDateTime = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + (settings?.max_advance_days || 30));
    return maxDate.toISOString().slice(0, 16);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Inspection Slots</h3>
            <p className="text-sm text-gray-500">
              {slots.length} of {settings?.max_slots_per_listing || 10} slots used
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowCreateForm(true)}
              disabled={slots.length >= (settings?.max_slots_per_listing || 10)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add Slot
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            {editingSlot ? 'Edit Inspection Slot' : 'Create New Inspection Slot'}
          </h4>
          
          <form onSubmit={editingSlot ? handleUpdateSlot : handleCreateSlot} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.slot_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, slot_at: e.target.value }))}
                  min={getMinDateTime()}
                  max={getMaxDateTime()}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                  min="1"
                  max="50"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <select
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Address
                </label>
                <input
                  type="text"
                  value={formData.location_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_address: e.target.value }))}
                  placeholder="Optional specific address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Notes
              </label>
              <textarea
                value={formData.location_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, location_notes: e.target.value }))}
                placeholder="Additional instructions for visitors..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingSlot ? 'Update Slot' : 'Create Slot'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Slots List */}
      <div className="p-6">
        {slots.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10m6-10v10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No inspection slots</h3>
            <p className="text-gray-500">
              {isOwner ? 'Create your first inspection slot to allow buyers to visit.' : 'No inspection slots available for this listing.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {slots.map((slot) => (
              <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="text-lg font-medium text-gray-900">
                        {formatDateTime(slot.slot_at)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          {slot.duration_minutes} min
                        </span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500">
                          {slot.available_capacity}/{slot.capacity} available
                        </span>
                        {!slot.is_active && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {slot.location_address && (
                      <p className="text-sm text-gray-600 mb-1">
                        📍 {slot.location_address}
                      </p>
                    )}
                    
                    {slot.location_notes && (
                      <p className="text-sm text-gray-500">
                        {slot.location_notes}
                      </p>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-400">
                      {slot.bookings_count > 0 && (
                        <span>{slot.bookings_count} booking(s) • </span>
                      )}
                      Created {formatDateTime(slot.created_at)}
                    </div>
                  </div>
                  
                  {isOwner && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => startEditing(slot)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
