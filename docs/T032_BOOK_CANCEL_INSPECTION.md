# T032: Book/Cancel Inspection (Buyer)

## Overview
Enable buyers to book and cancel inspection slots for listings they're interested in. This system provides a seamless booking experience with capacity validation, duplicate prevention, and automatic notifications to both buyers and sellers.

## Implementation Details

### Inspection Booking API
Create API endpoints for buyers to book and cancel inspection appointments with proper validation and notification handling.

### Booking API Implementation
```typescript
// src/app/api/listings/[id]/inspections/[inspectionId]/book/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';
import { getUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; inspectionId: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listingId, inspectionId } = params;

    // Get inspection details with listing info
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select(`
        id,
        slot_at,
        capacity,
        duration_minutes,
        notes,
        listing:listings(
          id,
          title,
          seller_id,
          seller:profiles(full_name, email)
        )
      `)
      .eq('id', inspectionId)
      .eq('listing_id', listingId)
      .single();

    if (inspectionError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Prevent seller from booking their own inspection
    if (inspection.listing.seller_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot book inspection for your own listing' },
        { status: 400 }
      );
    }

    // Check if inspection is in the future
    const inspectionTime = new Date(inspection.slot_at);
    const now = new Date();
    if (inspectionTime <= now) {
      return NextResponse.json(
        { error: 'Cannot book past inspection slots' },
        { status: 400 }
      );
    }

    // Check if user already has a booking for this inspection
    const { data: existingBooking } = await supabase
      .from('inspection_bookings')
      .select('id, status')
      .eq('inspection_id', inspectionId)
      .eq('user_id', user.id)
      .single();

    if (existingBooking) {
      if (existingBooking.status === 'booked') {
        return NextResponse.json(
          { error: 'You already have a booking for this inspection' },
          { status: 400 }
        );
      }
      // If cancelled, allow rebooking by updating the existing record
    }

    // Check capacity
    const { data: currentBookings } = await supabase
      .from('inspection_bookings')
      .select('id')
      .eq('inspection_id', inspectionId)
      .eq('status', 'booked');

    const bookedCount = currentBookings?.length || 0;
    if (bookedCount >= inspection.capacity) {
      return NextResponse.json(
        { error: 'Inspection is fully booked' },
        { status: 400 }
      );
    }

    // Create or update booking
    let booking;
    if (existingBooking) {
      const { data, error } = await supabase
        .from('inspection_bookings')
        .update({
          status: 'booked',
          booked_at: new Date().toISOString()
        })
        .eq('id', existingBooking.id)
        .select()
        .single();
      
      if (error) throw error;
      booking = data;
    } else {
      const { data, error } = await supabase
        .from('inspection_bookings')
        .insert({
          inspection_id: inspectionId,
          user_id: user.id,
          status: 'booked',
          booked_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      booking = data;
    }

    // Send notification to buyer
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'success',
        title: 'Inspection Booked',
        message: `Your inspection for "${inspection.listing.title}" is confirmed for ${new Date(inspection.slot_at).toLocaleString()}.`,
        link: `/listings/${listingId}`,
        created_at: new Date().toISOString()
      });

    // Send notification to seller
    await supabase
      .from('notifications')
      .insert({
        user_id: inspection.listing.seller_id,
        type: 'info',
        title: 'New Inspection Booking',
        message: `${user.full_name} booked an inspection for "${inspection.listing.title}" on ${new Date(inspection.slot_at).toLocaleString()}.`,
        link: `/listings/${listingId}`,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      booking,
      message: 'Inspection booked successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error booking inspection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Cancellation API Implementation
```typescript
// src/app/api/listings/[id]/inspections/[inspectionId]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';
import { getUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; inspectionId: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listingId, inspectionId } = params;

    // Find user's booking for this inspection
    const { data: booking, error: bookingError } = await supabase
      .from('inspection_bookings')
      .select(`
        id,
        status,
        inspection:inspections(
          id,
          slot_at,
          listing:listings(
            id,
            title,
            seller_id,
            seller:profiles(full_name, email)
          )
        )
      `)
      .eq('inspection_id', inspectionId)
      .eq('user_id', user.id)
      .eq('status', 'booked')
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if inspection is still in the future (allow cancellation up to 1 hour before)
    const inspectionTime = new Date(booking.inspection.slot_at);
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    if (inspectionTime <= oneHourFromNow) {
      return NextResponse.json(
        { error: 'Cannot cancel inspection less than 1 hour before scheduled time' },
        { status: 400 }
      );
    }

    // Cancel the booking
    const { error: cancelError } = await supabase
      .from('inspection_bookings')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    if (cancelError) throw cancelError;

    // Send notification to buyer
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'info',
        title: 'Inspection Cancelled',
        message: `Your inspection for "${booking.inspection.listing.title}" has been cancelled.`,
        link: `/listings/${listingId}`,
        created_at: new Date().toISOString()
      });

    // Send notification to seller
    await supabase
      .from('notifications')
      .insert({
        user_id: booking.inspection.listing.seller_id,
        type: 'warning',
        title: 'Inspection Cancelled',
        message: `${user.full_name} cancelled their inspection for "${booking.inspection.listing.title}" on ${new Date(booking.inspection.slot_at).toLocaleString()}.`,
        link: `/listings/${listingId}`,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      message: 'Inspection cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling inspection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### User's Inspection Bookings API
```typescript
// src/app/api/user/inspections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';
import { getUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'booked';
    const upcoming = searchParams.get('upcoming') === 'true';

    let query = supabase
      .from('inspection_bookings')
      .select(`
        id,
        status,
        booked_at,
        cancelled_at,
        inspection:inspections(
          id,
          slot_at,
          duration_minutes,
          notes,
          listing:listings(
            id,
            title,
            location_city,
            location_province,
            seller:profiles(full_name, phone)
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('status', status)
      .order('inspection.slot_at', { ascending: true });

    if (upcoming) {
      query = query.gte('inspection.slot_at', new Date().toISOString());
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching user inspections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### React Component for Inspection Booking
```typescript
// src/components/InspectionBooking.tsx
import { useState, useEffect } from 'react';
import { format, isAfter, addHours } from 'date-fns';

interface InspectionSlot {
  id: string;
  slot_at: string;
  capacity: number;
  duration_minutes: number;
  notes?: string;
  available_spots: number;
  user_booking?: {
    id: string;
    status: string;
    booked_at: string;
  };
}

export function InspectionBooking({ 
  listingId, 
  currentUserId 
}: { 
  listingId: string;
  currentUserId: string;
}) {
  const [inspections, setInspections] = useState<InspectionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  useEffect(() => {
    loadInspections();
  }, [listingId]);

  const loadInspections = async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}/inspections/available`);
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

  const handleBookInspection = async (inspectionId: string) => {
    setBookingLoading(inspectionId);
    try {
      const response = await fetch(
        `/api/listings/${listingId}/inspections/${inspectionId}/book`,
        { method: 'POST' }
      );

      if (response.ok) {
        await loadInspections();
        alert('Inspection booked successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to book inspection');
      }
    } catch (error) {
      console.error('Failed to book inspection:', error);
      alert('Failed to book inspection');
    } finally {
      setBookingLoading(null);
    }
  };

  const handleCancelInspection = async (inspectionId: string) => {
    if (!confirm('Are you sure you want to cancel this inspection?')) {
      return;
    }

    setBookingLoading(inspectionId);
    try {
      const response = await fetch(
        `/api/listings/${listingId}/inspections/${inspectionId}/cancel`,
        { method: 'POST' }
      );

      if (response.ok) {
        await loadInspections();
        alert('Inspection cancelled successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel inspection');
      }
    } catch (error) {
      console.error('Failed to cancel inspection:', error);
      alert('Failed to cancel inspection');
    } finally {
      setBookingLoading(null);
    }
  };

  const canCancelInspection = (slotTime: string) => {
    const inspectionTime = new Date(slotTime);
    const oneHourFromNow = addHours(new Date(), 1);
    return isAfter(inspectionTime, oneHourFromNow);
  };

  if (loading) {
    return <div className="animate-pulse">Loading inspection slots...</div>;
  }

  if (inspections.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No inspection slots available for this listing.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Available Inspection Times</h3>
      
      <div className="space-y-3">
        {inspections.map((inspection) => {
          const isBooked = inspection.user_booking?.status === 'booked';
          const canCancel = isBooked && canCancelInspection(inspection.slot_at);
          const isLoading = bookingLoading === inspection.id;
          
          return (
            <div key={inspection.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">
                      {format(new Date(inspection.slot_at), 'PPP p')}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      isBooked 
                        ? 'bg-blue-100 text-blue-800'
                        : inspection.available_spots > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {isBooked 
                        ? 'Booked' 
                        : `${inspection.available_spots} spots available`
                      }
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1">
                    Duration: {inspection.duration_minutes} minutes
                  </p>
                  
                  {inspection.notes && (
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Notes:</strong> {inspection.notes}
                    </p>
                  )}
                  
                  {isBooked && inspection.user_booking && (
                    <p className="text-sm text-green-600">
                      Booked on {format(new Date(inspection.user_booking.booked_at), 'PPP p')}
                    </p>
                  )}
                </div>
                
                <div className="ml-4">
                  {isBooked ? (
                    canCancel ? (
                      <button
                        onClick={() => handleCancelInspection(inspection.id)}
                        disabled={isLoading}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        {isLoading ? 'Cancelling...' : 'Cancel'}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Cannot cancel (less than 1 hour)
                      </span>
                    )
                  ) : inspection.available_spots > 0 ? (
                    <button
                      onClick={() => handleBookInspection(inspection.id)}
                      disabled={isLoading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {isLoading ? 'Booking...' : 'Book Inspection'}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">Fully Booked</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Inspection Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Arrive on time for your scheduled inspection</li>
          <li>• Bring valid ID and any measuring tools you need</li>
          <li>• Cancellations must be made at least 1 hour in advance</li>
          <li>• Contact the seller if you need to reschedule</li>
        </ul>
      </div>
    </div>
  );
}
```

### User's Upcoming Inspections Component
```typescript
// src/components/UpcomingInspections.tsx
import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import Link from 'next/link';

interface UserInspection {
  id: string;
  status: string;
  booked_at: string;
  inspection: {
    id: string;
    slot_at: string;
    duration_minutes: number;
    notes?: string;
    listing: {
      id: string;
      title: string;
      location_city: string;
      location_province: string;
      seller: {
        full_name: string;
        phone?: string;
      };
    };
  };
}

export function UpcomingInspections() {
  const [inspections, setInspections] = useState<UserInspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      const response = await fetch('/api/user/inspections?upcoming=true');
      if (response.ok) {
        const data = await response.json();
        setInspections(data.bookings || []);
      }
    } catch (error) {
      console.error('Failed to load inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'PPP');
  };

  if (loading) {
    return <div className="animate-pulse">Loading your inspections...</div>;
  }

  if (inspections.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        You have no upcoming inspections scheduled.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your Upcoming Inspections</h3>
      
      <div className="space-y-3">
        {inspections.map((booking) => (
          <div key={booking.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <Link 
                  href={`/listings/${booking.inspection.listing.id}`}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  {booking.inspection.listing.title}
                </Link>
                
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>
                    <strong>{getDateLabel(booking.inspection.slot_at)}</strong> at{' '}
                    {format(new Date(booking.inspection.slot_at), 'p')}
                  </p>
                  <p>
                    Duration: {booking.inspection.duration_minutes} minutes
                  </p>
                  <p>
                    Location: {booking.inspection.listing.location_city}, {booking.inspection.listing.location_province}
                  </p>
                  <p>
                    Seller: {booking.inspection.listing.seller.full_name}
                    {booking.inspection.listing.seller.phone && (
                      <span> • {booking.inspection.listing.seller.phone}</span>
                    )}
                  </p>
                  {booking.inspection.notes && (
                    <p>
                      <strong>Notes:</strong> {booking.inspection.notes}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="ml-4 text-right">
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Confirmed
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Files Created/Modified
- `src/app/api/listings/[id]/inspections/[inspectionId]/book/route.ts` - Booking API
- `src/app/api/listings/[id]/inspections/[inspectionId]/cancel/route.ts` - Cancellation API
- `src/app/api/user/inspections/route.ts` - User's inspection bookings
- `src/components/InspectionBooking.tsx` - Booking interface for buyers
- `src/components/UpcomingInspections.tsx` - User's upcoming inspections dashboard

## Technical Considerations
- **Capacity Validation**: Real-time capacity checking to prevent overbooking
- **Duplicate Prevention**: Prevent multiple bookings by same user for same slot
- **Time Validation**: Enforce booking and cancellation time restrictions
- **Notification System**: Automatic notifications to both buyers and sellers
- **Authorization**: Prevent sellers from booking their own inspections
- **Data Consistency**: Atomic operations for booking/cancellation

## Success Metrics
- Zero double bookings or capacity violations
- Booking confirmation within 2 seconds
- 100% notification delivery for bookings/cancellations
- Clear booking status display for users
- Intuitive cancellation process with proper time restrictions
- Seamless integration with seller's inspection management

## Dependencies
- Existing inspection slots management system
- User authentication and profiles
- Notification system
- Date/time utilities for validation and formatting
