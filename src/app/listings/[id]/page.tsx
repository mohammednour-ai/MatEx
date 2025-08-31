'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  HeartIcon,
  ShareIcon,
} from '@/components/Icons';

interface Listing {
  id: string;
  title: string;
  description: string;
  material_type: string;
  category: string;
  condition: string;
  quantity: number;
  unit: string;
  pricing_type: 'fixed' | 'auction';
  price_per_unit_cad: number;
  buy_now_price_cad?: number;
  location_city: string;
  location_province: string;
  available_from: string;
  available_until?: string;
  handling_instructions?: string;
  status: 'draft' | 'active' | 'sold' | 'expired';
  created_at: string;
  seller_id: string;
  profiles: {
    full_name: string;
    company_name?: string;
    phone?: string;
    email: string;
    role: string;
    kyc_status: string;
  };
  listing_images: {
    url: string;
    sort_order: number;
  }[];
  auctions?: {
    start_at: string;
    end_at: string;
    min_increment_cad: number;
    soft_close_seconds: number;
  };
  inspections: {
    id: string;
    slot_at: string;
    capacity: number;
    inspection_bookings: {
      id: string;
      status: string;
    }[];
  }[];
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showContactInfo, setShowContactInfo] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select(`
            *,
            profiles!seller_id (
              full_name,
              company_name,
              phone,
              email,
              role,
              kyc_status
            ),
            listing_images (
              url,
              sort_order
            ),
            auctions (
              start_at,
              end_at,
              min_increment_cad,
              soft_close_seconds
            ),
            inspections (
              id,
              slot_at,
              capacity,
              inspection_bookings (
                id,
                status
              )
            )
          `)
          .eq('id', params.id)
          .single();

        if (error) {
          console.error('Error fetching listing:', error);
          setError('Failed to load listing');
          return;
        }

        if (!data) {
          setError('Listing not found');
          return;
        }

        // Sort images by sort_order
        if (data.listing_images) {
          data.listing_images.sort((a: any, b: any) => a.sort_order - b.sort_order);
        }

        // Sort inspections by slot_at
        if (data.inspections) {
          data.inspections.sort((a: any, b: any) => new Date(a.slot_at).getTime() - new Date(b.slot_at).getTime());
        }

        setListing(data);
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchListing();
    }
  }, [params.id, supabase]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      sold: { color: 'bg-blue-100 text-blue-800', label: 'Sold' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getConditionBadge = (condition: string) => {
    const conditionConfig = {
      new: { color: 'bg-green-100 text-green-800', label: 'New' },
      'like-new': { color: 'bg-blue-100 text-blue-800', label: 'Like New' },
      good: { color: 'bg-yellow-100 text-yellow-800', label: 'Good' },
      fair: { color: 'bg-orange-100 text-orange-800', label: 'Fair' },
      poor: { color: 'bg-red-100 text-red-800', label: 'Poor' },
    };
    const config = conditionConfig[condition as keyof typeof conditionConfig] || conditionConfig.good;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const isOwner = user && listing && user.id === listing.seller_id;
  const canContact = user && !isOwner;
  const totalValue = listing ? listing.quantity * listing.price_per_unit_cad : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {error || 'Listing not found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            The listing you're looking for doesn't exist or has been removed.
          </p>
          <div className="mt-6">
            <Link
              href="/listings"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeftIcon className="-ml-1 mr-2 h-4 w-4" />
              Back to Listings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back
          </button>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <HeartIcon className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <ShareIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="aspect-w-16 aspect-h-9">
                {listing.listing_images && listing.listing_images.length > 0 ? (
                  <img
                    src={listing.listing_images[selectedImageIndex]?.url}
                    alt={listing.title}
                    className="w-full h-96 object-cover"
                  />
                ) : (
                  <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image available</span>
                  </div>
                )}
              </div>
              {listing.listing_images && listing.listing_images.length > 1 && (
                <div className="p-4 flex space-x-2 overflow-x-auto">
                  {listing.listing_images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                        selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={`${listing.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Listing Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusBadge(listing.status)}
                    {getConditionBadge(listing.condition)}
                    <span className="text-sm text-gray-500 capitalize">{listing.pricing_type}</span>
                  </div>
                </div>
              </div>

              <div className="prose max-w-none mb-6">
                <p className="text-gray-700">{listing.description}</p>
              </div>

              {/* Specifications */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Specifications</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Material Type</dt>
                    <dd className="text-sm text-gray-900 capitalize">{listing.material_type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="text-sm text-gray-900 capitalize">{listing.category}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                    <dd className="text-sm text-gray-900">{listing.quantity} {listing.unit}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Condition</dt>
                    <dd className="text-sm text-gray-900 capitalize">{listing.condition}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="text-sm text-gray-900 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {listing.location_city}, {listing.location_province}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Available From</dt>
                    <dd className="text-sm text-gray-900 flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {formatDate(listing.available_from)}
                    </dd>
                  </div>
                  {listing.available_until && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Available Until</dt>
                      <dd className="text-sm text-gray-900 flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {formatDate(listing.available_until)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Handling Instructions */}
              {listing.handling_instructions && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Handling Instructions</h3>
                  <p className="text-sm text-gray-700">{listing.handling_instructions}</p>
                </div>
              )}
            </div>

            {/* Inspection Slots */}
            {listing.inspections && listing.inspections.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Inspection Slots</h3>
                <div className="space-y-3">
                  {listing.inspections.map((inspection) => {
                    const bookedCount = inspection.inspection_bookings.filter(
                      booking => booking.status === 'booked'
                    ).length;
                    const availableSpots = inspection.capacity - bookedCount;
                    
                    return (
                      <div
                        key={inspection.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                      >
                        <div className="flex items-center">
                          <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {formatDateTime(inspection.slot_at)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {availableSpots} of {inspection.capacity} spots available
                          </span>
                          {canContact && availableSpots > 0 && (
                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                              Book
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Seller Info and Pricing */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(listing.price_per_unit_cad)}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">per {listing.unit}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Total value: <span className="font-medium">{formatPrice(totalValue)}</span>
                </div>
              </div>

              {listing.pricing_type === 'auction' && listing.auctions && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-800">Auction</span>
                  </div>
                  <div className="mt-2 text-sm text-yellow-700">
                    <div>Starts: {formatDateTime(listing.auctions.start_at)}</div>
                    <div>Ends: {formatDateTime(listing.auctions.end_at)}</div>
                    <div>Min increment: {formatPrice(listing.auctions.min_increment_cad)}</div>
                  </div>
                </div>
              )}

              {listing.buy_now_price_cad && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600">Buy Now Price:</div>
                  <div className="text-xl font-semibold text-green-600">
                    {formatPrice(listing.buy_now_price_cad)}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {isOwner ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">This is your listing</p>
                    <Link
                      href={`/listings/${listing.id}/edit`}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Edit Listing
                    </Link>
                  </div>
                ) : !user ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">Sign in to contact seller</p>
                    <Link
                      href="/login"
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Sign In
                    </Link>
                  </div>
                ) : (
                  <>
                    {listing.pricing_type === 'fixed' && (
                      <button className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                        Buy Now
                      </button>
                    )}
                    {listing.pricing_type === 'auction' && (
                      <button className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        Place Bid
                      </button>
                    )}
                    <button
                      onClick={() => setShowContactInfo(!showContactInfo)}
                      className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      Contact Seller
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Seller Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Seller Information</h3>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {listing.profiles.company_name || listing.profiles.full_name}
                  </div>
                  {listing.profiles.company_name && (
                    <div className="text-sm text-gray-500">{listing.profiles.full_name}</div>
                  )}
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-500 capitalize mr-2">
                      {listing.profiles.role}
                    </span>
                    {listing.profiles.kyc_status === 'approved' && (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              </div>

              {showContactInfo && canContact && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      <a href={`mailto:${listing.profiles.email}`} className="hover:text-blue-600">
                        {listing.profiles.email}
                      </a>
                    </div>
                    {listing.profiles.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        <a href={`tel:${listing.profiles.phone}`} className="hover:text-blue-600">
                          {listing.profiles.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 text-xs text-gray-500">
                Listed on {formatDate(listing.created_at)}
              </div>
            </div>

            {/* Safety Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Safety Notice</p>
                  <p>Always inspect materials before purchase. Meet in safe, public locations when possible.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
