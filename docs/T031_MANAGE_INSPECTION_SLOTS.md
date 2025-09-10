# T031: Manage Inspection Slots (Seller)

## Overview
Enable sellers to create, manage, and configure inspection time slots for their listings. This system allows sellers to set available inspection times with capacity limits and buffer periods, ensuring organized and manageable property inspections for potential buyers.

## Implementation Details

### Inspection Management API
Create API endpoints for sellers to manage their inspection slots with validation and conflict prevention.

### API Route Implementation
```typescript
// src/app/api/listings/[id]/inspections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';
import { getUser } from '@/lib/auth';

interface InspectionSlot {
  slot_at: string;
  capacity: number;
  duration_minutes?: number;
  notes?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listingId = params.id;

    // Verify user owns the listing
    const { data: listing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .single();

    if (!listing || listing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get inspection slots with booking counts
    const { data: inspections, error } = await supabase
      .from('inspections')
      .select(`
        id,
        slot_at,
        capacity,
        duration_minutes,
        notes,
        bookings:inspection_bookings(
          id,
          user_id,
          status,
          booked_at,
          user:profiles(full_name, email)
        )
      `)
      .eq('listing_id', listingId)
      .order('slot_at', { ascending: true });

    if (error) throw error;

    // Calculate availability for each slot
    const slotsWithAvailability = inspections?.map(slot => ({
      ...slot,
      booked_count: slot.bookings?.filter(b => b.status === 'booked').length || 0,
      available_spots: slot.capacity - (slot.bookings?.filter(b => b.status === 'booked').length || 0)
    }));

    return NextResponse.json({ inspections: slotsWithAvailability });
  } catch (error) {
    console.error('Error fetching inspections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listingId = params.id;
    const body: InspectionSlot = await request.json();

    // Verify user owns the listing
    const { data: listing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .single();

    if (!listing || listing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate slot time is in the future
    const slotTime = new Date(body.slot_at);
    const now = new Date();
    if (slotTime <= now) {
      return NextResponse.json(
        { error: 'Inspection slot must be in the future' },
        { status: 400 }
      );
    }

    // Get buffer settings from app_settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .in('key', ['inspection.buffer_hours', 'inspection.max_capacity'])
      .then(res => {
        const settingsMap = res.data?.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, any>) || {};
        return { data: settingsMap };
      });

    const bufferHours = settings?.data?.['inspection.buffer_hours'] || 2;
    const maxCapacity = settings?.data?.['inspection.max_capacity'] || 10;

    // Validate capacity
    if (body.capacity > maxCapacity) {
      return NextResponse.json(
        { error: `Capacity cannot exceed ${maxCapacity}` },
        { status: 400 }
      );
    }

    // Check for time conflicts (within buffer period)
    const bufferStart = new Date(slotTime.getTime() - bufferHours * 60 * 60 * 1000);
    const bufferEnd = new Date(slotTime.getTime() + bufferHours * 60 * 60 * 1000);

    const { data: conflicts } = await supabase
      .from('inspections')
      .select('id, slot_at')
      .eq('listing_id', listingId)
      .gte('slot_at', bufferStart.toISOString())
      .lte('slot_at', bufferEnd.toISOString());

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: `Inspection slot conflicts with existing slots. Minimum ${bufferHours} hour buffer required.` },
        { status: 400 }
      );
    }

    // Create inspection slot
    const { data: inspection, error } = await supabase
      .from('inspections')
      .insert({
        listing_id: listingId,
        slot_at: body.slot_at,
        capacity: body.capacity,
        duration_minutes: body.duration_minutes || 60,
        notes: body.notes
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ inspection }, { status: 201 });
  } catch (error) {
    console.error('Error creating inspection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Individual Inspection Slot Management
```typescript
// src/app/api/listings/[id]/inspections/[inspectionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';
import { getUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; inspectionId: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listingId, inspectionId } = params;
    const updates = await request.json();

    // Verify user owns the listing
    const { data: listing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .single();

    if (!listing || listing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if inspection has bookings
    const { data: bookings } = await supabase
      .from('inspection_bookings')
      .select('id, status')
      .eq('inspection_id', inspectionId)
      .eq('status', 'booked');

    if (bookings && bookings.length > 0 && updates.slot_at) {
      return NextResponse.json(
        { error: 'Cannot change time of inspection with existing bookings' },
        { status: 400 }
      );
    }

    // Update inspection
    const { data: inspection, error } = await supabase
      .from('inspections')
      .update(updates)
      .eq('id', inspectionId)
      .eq('listing_id', listingId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ inspection });
  } catch (error) {
    console.error('Error updating inspection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; inspectionId: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listingId, inspectionId } = params;

    // Verify user owns the listing
    const { data: listing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .single();

    if (!listing || listing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for existing bookings
    const { data: bookings } = await supabase
      .from('inspection_bookings')
      .select('id, user_id, user:profiles(full_name, email)')
      .eq('inspection_id', inspectionId)
      .eq('status', 'booked');

    if (bookings && bookings.length > 0) {
      // Cancel all bookings and notify users
      await supabase
        .from('inspection_bookings')
        .update({ status: 'cancelled' })
        .eq('inspection_id', inspectionId);

      // Send notifications to affected users
      for (const booking of bookings) {
        await supabase
          .from('notifications')
          .insert({
            user_id: booking.user_id,
            type: 'warning',
            title: 'Inspection Cancelled',
            message: 'An inspection you booked has been cancelled by the seller.',
            link: `/listings/${listingId}`,
            created_at: new Date().toISOString()
          });
      }
    }

    // Delete inspection
    const { error } = await supabase
      .from('inspections')
      .delete()
      .eq('id', inspectionId)
      .eq('listing_id', listingId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inspection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### React Component for Inspection Management
```typescript
// src/components/InspectionManager.tsx
import { useState, useEffect } from 'react';
import { format, addDays, isAfter } from 'date-fns';

interface InspectionSlot {
  id: string;
  slot_at: string;
  capacity: number;
  duration_minutes: number;
  notes?: string;
  booked_count: number;
  available_spots: number;
  bookings: Array<{
    id: string;
    user_id: string;
    status: string;
    booked_at: string;
    user: {
      full_name: string;
      email: string;
    };
  }>;
}

export function InspectionManager({ listingId }: { listingId: string }) {
  const [inspections, setInspections] = useState<InspectionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    slot_at: '',
    capacity: 5,
    duration_minutes: 60,
    notes: ''
  });

  useEffect(() => {
    loadInspections();
  }, [listingId]);

  const loadInspections = async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}/inspections`);
      if (response.ok) {
        const data = await response.json();
        setInspections(data.inspections || []);
      }
    } catch (error) {
      console.error('Failed to load inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/listings/${listingId}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSlot)
      });

      if (response.ok) {
        await loadInspections();
        setShowAddForm(false);
        setNewSlot({
          slot_at: '',
          capacity: 5,
          duration_minutes: 60,
          notes: ''
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create inspection slot');
      }
    } catch (error) {
      console.error('Failed to add inspection:', error);
    }
  };

  const handleDeleteSlot = async (inspectionId: string) => {
    if (!confirm('Are you sure? This will cancel all existing bookings.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/listings/${listingId}/inspections/${inspectionId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await loadInspections();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete inspection slot');
      }
    } catch (error) {
      console.error('Failed to delete inspection:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading inspections...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Inspection Slots</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Slot
        </button>
      </div>

      {/* Add Slot Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <form onSubmit={handleAddSlot} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newSlot.slot_at}
                  onChange={(e) => setNewSlot(prev => ({ ...prev, slot_at: e.target.value }))}
                  min={format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newSlot.capacity}
                  onChange={(e) => setNewSlot(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Duration (minutes)
              </label>
              <select
                value={newSlot.duration_minutes}
                onChange={(e) => setNewSlot(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <textarea
                value={newSlot.notes}
                onChange={(e) => setNewSlot(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                rows={2}
                placeholder="Special instructions or requirements..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Slot
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inspection Slots List */}
      <div className="space-y-4">
        {inspections.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No inspection slots created yet. Add your first slot to allow buyers to schedule inspections.
          </p>
        ) : (
          inspections.map((inspection) => (
            <div key={inspection.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h4 className="font-medium">
                      {format(new Date(inspection.slot_at), 'PPP p')}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      inspection.available_spots > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {inspection.available_spots} / {inspection.capacity} available
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Duration: {inspection.duration_minutes} minutes
                  </p>
                  {inspection.notes && (
                    <p className="text-sm text-gray-600 mt-1">
                      Notes: {inspection.notes}
                    </p>
                  )}
                  
                  {/* Bookings List */}
                  {inspection.bookings && inspection.bookings.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Bookings:</h5>
                      <div className="space-y-1">
                        {inspection.bookings
                          .filter(booking => booking.status === 'booked')
                          .map((booking) => (
                          <div key={booking.id} className="text-sm text-gray-600">
                            {booking.user.full_name} ({booking.user.email})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleDeleteSlot(inspection.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

## Files Created/Modified
- `src/app/api/listings/[id]/inspections/route.ts` - Inspection slots CRUD API
- `src/app/api/listings/[id]/inspections/[inspectionId]/route.ts` - Individual slot management
- `src/components/InspectionManager.tsx` - Seller inspection management UI
- Database: Enhanced inspections table with duration and notes fields

## Technical Considerations
- **Buffer Validation**: Enforce minimum time buffers between inspection slots
- **Capacity Management**: Prevent overbooking with real-time availability checks
- **Conflict Detection**: Validate time overlaps and scheduling conflicts
- **Notification System**: Automatically notify affected users when slots are cancelled
- **Authorization**: Ensure only listing owners can manage their inspection slots
- **Data Integrity**: Maintain referential integrity between inspections and bookings

## Success Metrics
- Zero scheduling conflicts or double bookings
- Inspection slots created within 2 seconds
- Automatic notifications sent to affected users within 30 seconds
- 100% authorization accuracy (only owners can manage slots)
- Clear availability display with real-time updates
- Intuitive UI with minimal user errors

## Dependencies
- Existing listings and profiles system
- Notification system for cancellation alerts
- Date/time validation and formatting utilities
- Authentication and authorization system
