'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Phone, Mail, AlertCircle, CheckCircle, XCircle } from './Icons';

interface InspectionSlot {
  id: string;
  slot_at: string;
  capacity: number;
  duration_minutes: number;
  location_address?: string;
  location_notes?: string;
  available_capacity: number;
  bookings_count: number;
}

interface InspectionBooking {
  booking_id: string;
  inspection_id: string;
  status: 'booked' | 'cancelled' | 'attended' | 'no_show';
  notes?: string;
  booked_at: string;
  cancelled_at?: string;
  inspection: {
    slot_at: string;
    capacity: number;
    duration_minutes: number;
    location_address?: string;
    location_notes?: string;
    listing: {
      id: string;
      title: string;
      material: string;
      location: string;
      seller: {
        name: string;
        phone: string;
        email: string;
      };
    };
  };
}

interface InspectionBookingManagerProps {
  listingId: string;
  userId?: string;
  userEmail?: string;
}

export default function InspectionBookingManager({ 
  listingId, 
  userId, 
  userEmail 
}: InspectionBookingManagerProps) {
  const [availableSlots, setAvailableSlots] = useState<InspectionSlot[]>([]);
  const [userBookings, setUserBookings] = useState<InspectionBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState<{ [key: string]: string }>({});

  // Fetch available inspection slots
  const fetchAvailableSlots = async () => {
    try {
      const response = await fetch(`/api/inspections?listing_id=${listingId}`);
      const data = await response.json();
      
      if (data.success) {
        // Filter out past slots and slots with no capacity
        const now = new Date();
        const futureSlots = data.data.filter((slot: InspectionSlot) => 
          new Date(slot.slot_at) > now && slot.available_capacity > 0
        );
        setAvailableSlots(futureSlots);
      } else {
        setError(data.error || 'Failed to fetch inspection slots');
      }
    } catch (err) {
      setError('Failed to fetch inspection slots');
      console.error('Error fetching slots:', err);
    }
  };

  // Fetch user's bookings
  const fetchUserBookings = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/inspections/bookings?upcoming=true', {
        headers: {
          'x-user-id': userId,
          'x-user-email': userEmail || ''
        }
      });
      const data = await response.json();
      
      if (data.success) {
        // Filter bookings for this listing
        const listingBookings = data.data.filter((booking: InspectionBooking) => 
          booking.inspection.listing.id === listingId && booking.status === 'booked'
        );
        setUserBookings(listingBookings);
      } else {
        console.error('Failed to fetch user bookings:', data.error);
      }
    } catch (err) {
      console.error('Error fetching user bookings:', err);
    }
  };

  // Book an inspection slot
  const bookInspection = async (inspectionId: string) => {
    if (!userId || !userEmail) {
      setError('Please log in to book an inspection');
      return;
    }

    setBookingLoading(inspectionId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/inspections/${inspectionId}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-email': userEmail
        },
        body: JSON.stringify({
          notes: bookingNotes[inspectionId] || ''
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Inspection booked successfully!');
        // Refresh data
        await Promise.all([fetchAvailableSlots(), fetchUserBookings()]);
        // Clear notes
        setBookingNotes(prev => ({ ...prev, [inspectionId]: '' }));
      } else {
        setError(data.error || 'Failed to book inspection');
      }
    } catch (err) {
      setError('Failed to book inspection');
      console.error('Error booking inspection:', err);
    } finally {
      setBookingLoading(null);
    }
  };

  // Cancel an inspection booking
  const cancelBooking = async (inspectionId: string) => {
    if (!userId) return;

    setBookingLoading(inspectionId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/inspections/${inspectionId}/book`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
          'x-user-email': userEmail || ''
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Inspection booking cancelled successfully');
        // Refresh data
        await Promise.all([fetchAvailableSlots(), fetchUserBookings()]);
      } else {
        setError(data.error || 'Failed to cancel booking');
      }
    } catch (err) {
      setError('Failed to cancel booking');
      console.error('Error cancelling booking:', err);
    } finally {
      setBookingLoading(null);
    }
  };

  // Check if user already has a booking for this inspection
  const hasBooking = (inspectionId: string) => {
    return userBookings.some(booking => booking.inspection_id === inspectionId);
  };

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Calculate time until inspection
  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const inspectionTime = new Date(dateString);
    const diffMs = inspectionTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'soon';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAvailableSlots(), fetchUserBookings()]);
      setLoading(false);
    };

    loadData();
  }, [listingId, userId]);

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
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
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Inspection Bookings</h3>
        <p className="text-sm text-gray-600 mt-1">
          Book an inspection slot to view this item in person
        </p>
      </div>

      <div className="p-6">
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700">{success}</span>
          </div>
        )}

        {/* User's Current Bookings */}
        {userBookings.length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">Your Upcoming Inspections</h4>
            <div className="space-y-3">
              {userBookings.map((booking) => {
                const { date, time } = formatDateTime(booking.inspection.slot_at);
                return (
                  <div key={booking.booking_id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">{date}</span>
                          <Clock className="h-4 w-4 text-blue-600 ml-2" />
                          <span className="font-medium text-blue-900">{time}</span>
                          <span className="text-sm text-blue-700">({getTimeUntil(booking.inspection.slot_at)})</span>
                        </div>
                        
                        {booking.inspection.location_address && (
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-blue-800">{booking.inspection.location_address}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-800">{booking.inspection.listing.seller.name}</span>
                          <Phone className="h-4 w-4 text-blue-600 ml-2" />
                          <span className="text-sm text-blue-800">{booking.inspection.listing.seller.phone}</span>
                        </div>

                        {booking.notes && (
                          <div className="text-sm text-blue-700 mt-2">
                            <strong>Your notes:</strong> {booking.notes}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => cancelBooking(booking.inspection_id)}
                        disabled={bookingLoading === booking.inspection_id}
                        className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        {bookingLoading === booking.inspection_id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Slots */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Available Inspection Slots</h4>
          
          {availableSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No inspection slots available at this time</p>
              <p className="text-sm">Check back later or contact the seller directly</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableSlots.map((slot) => {
                const { date, time } = formatDateTime(slot.slot_at);
                const userHasBooking = hasBooking(slot.id);
                
                return (
                  <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-600" />
                            <span className="font-medium">{date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-600" />
                            <span className="font-medium">{time}</span>
                            <span className="text-sm text-gray-500">
                              ({slot.duration_minutes} min)
                            </span>
                          </div>
                        </div>

                        {slot.location_address && (
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-gray-600" />
                            <span className="text-sm text-gray-700">{slot.location_address}</span>
                          </div>
                        )}

                        <div className="text-sm text-gray-600 mb-3">
                          {slot.available_capacity} of {slot.capacity} spots available
                        </div>

                        {!userHasBooking && userId && (
                          <div className="mb-3">
                            <textarea
                              placeholder="Add any notes for the seller (optional)"
                              value={bookingNotes[slot.id] || ''}
                              onChange={(e) => setBookingNotes(prev => ({ ...prev, [slot.id]: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                              rows={2}
                              maxLength={500}
                            />
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        {!userId ? (
                          <div className="text-sm text-gray-500">
                            <p>Log in to book</p>
                          </div>
                        ) : userHasBooking ? (
                          <div className="text-sm text-green-600 font-medium">
                            ✓ Booked
                          </div>
                        ) : (
                          <button
                            onClick={() => bookInspection(slot.id)}
                            disabled={bookingLoading === slot.id}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {bookingLoading === slot.id ? 'Booking...' : 'Book Slot'}
                          </button>
                        )}
                      </div>
                    </div>

                    {slot.location_notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                        <strong>Location notes:</strong> {slot.location_notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
