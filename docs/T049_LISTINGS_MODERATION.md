# T049: Listings Moderation

## Overview
Create an admin listings moderation interface that allows admins to search/filter listings, toggle listing status, view associated inspections, and perform bulk operations for content moderation and platform management.

## Implementation Details

### Listings Moderation Page
Create the main admin listings moderation interface.

```typescript
// src/app/admin/listings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  EyeIcon, 
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  MapPinIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface Listing {
  id: string;
  title: string;
  description: string;
  material: string;
  condition: string;
  quantity: number;
  unit: string;
  pricing_type: 'fixed' | 'auction';
  price_cad?: number;
  buy_now_cad?: number;
  location_city: string;
  location_province: string;
  status: 'draft' | 'active' | 'sold' | 'expired' | 'suspended';
  created_at: string;
  updated_at: string;
  seller: {
    id: string;
    full_name: string;
    email: string;
    kyc_status: string;
  };
  images: ListingImage[];
  inspections?: Inspection[];
  auction?: {
    start_at: string;
    end_at: string;
    current_bid?: number;
    bid_count: number;
  };
}

interface ListingImage {
  id: string;
  url: string;
  sort_order: number;
}

interface Inspection {
  id: string;
  slot_at: string;
  capacity: number;
  bookings_count: number;
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadListings();
  }, [statusFilter, materialFilter]);

  const loadListings = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (materialFilter !== 'all') params.append('material', materialFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/listings?${params}`);
      const data = await response.json();
      
      if (data.listings) {
        setListings(data.listings);
      }
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    loadListings();
  };

  const toggleListingStatus = async (listingId: string, newStatus: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update listing status');
      }

      // Refresh listings
      await loadListings();
      alert(`Listing ${newStatus} successfully`);
    } catch (error) {
      console.error('Failed to update listing:', error);
      alert('Failed to update listing. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedListings.length === 0) {
      alert('Please select listings to update');
      return;
    }

    if (!confirm(`Are you sure you want to ${status} ${selectedListings.length} listing(s)?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/listings/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          listingIds: selectedListings,
          status 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to bulk update listings');
      }

      setSelectedListings([]);
      await loadListings();
      alert(`${selectedListings.length} listing(s) ${status} successfully`);
    } catch (error) {
      console.error('Failed to bulk update:', error);
      alert('Failed to bulk update listings. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const openListingModal = (listing: Listing) => {
    setSelectedListing(listing);
  };

  const closeListingModal = () => {
    setSelectedListing(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'sold':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Draft' },
    { value: 'sold', label: 'Sold' },
    { value: 'expired', label: 'Expired' },
    { value: 'suspended', label: 'Suspended' }
  ];

  const materialOptions = [
    { value: 'all', label: 'All Materials' },
    { value: 'metal', label: 'Metal' },
    { value: 'plastic', label: 'Plastic' },
    { value: 'paper', label: 'Paper' },
    { value: 'glass', label: 'Glass' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'other', label: 'Other' }
  ];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Listings Moderation</h1>
        <p className="text-gray-600">Manage and moderate platform listings</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search listings..."
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
              <select
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {materialOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedListings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedListings.length} listing(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => bulkUpdateStatus('active')}
                disabled={processing}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Activate
              </button>
              <button
                onClick={() => bulkUpdateStatus('suspended')}
                disabled={processing}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <XCircleIcon className="h-4 w-4 mr-1" />
                Suspend
              </button>
              <button
                onClick={() => setSelectedListings([])}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listings Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No listings found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No listings match your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedListings.length === listings.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedListings(listings.map(l => l.id));
                          } else {
                            setSelectedListings([]);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Listing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {listings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedListings.includes(listing.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedListings([...selectedListings, listing.id]);
                            } else {
                              setSelectedListings(selectedListings.filter(id => id !== listing.id));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {listing.images.length > 0 && (
                            <img
                              className="h-10 w-10 rounded-lg object-cover mr-3"
                              src={listing.images[0].url}
                              alt={listing.title}
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {listing.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {listing.material} • {listing.quantity} {listing.unit}
                            </div>
                            <div className="flex items-center text-xs text-gray-400 mt-1">
                              <MapPinIcon className="h-3 w-3 mr-1" />
                              {listing.location_city}, {listing.location_province}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{listing.seller.full_name}</div>
                        <div className="text-sm text-gray-500">{listing.seller.email}</div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          listing.seller.kyc_status === 'approved' ? 'bg-green-100 text-green-800' :
                          listing.seller.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          KYC: {listing.seller.kyc_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(listing.status)}`}>
                          {listing.status}
                        </span>
                        {listing.pricing_type === 'auction' && listing.auction && (
                          <div className="text-xs text-gray-500 mt-1">
                            {listing.auction.bid_count} bids
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {listing.pricing_type === 'fixed' ? (
                          <div>
                            <div>${listing.price_cad?.toFixed(2)}</div>
                            {listing.buy_now_cad && (
                              <div className="text-xs text-gray-500">
                                Buy Now: ${listing.buy_now_cad.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="text-xs text-gray-500">Auction</div>
                            {listing.auction?.current_bid ? (
                              <div>${listing.auction.current_bid.toFixed(2)}</div>
                            ) : (
                              <div className="text-gray-400">No bids</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(listing.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openListingModal(listing)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {listing.status === 'active' ? (
                            <button
                              onClick={() => toggleListingStatus(listing.id, 'suspended')}
                              disabled={processing}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          ) : listing.status === 'suspended' ? (
                            <button
                              onClick={() => toggleListingStatus(listing.id, 'active')}
                              disabled={processing}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Listing Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeListingModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Listing Details - {selectedListing.title}
                  </h3>
                  <button
                    onClick={closeListingModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Listing Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Listing Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedListing.title}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedListing.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Material</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedListing.material}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Condition</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedListing.condition}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Quantity</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedListing.quantity} {selectedListing.unit}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Pricing Type</label>
                          <p className="mt-1 text-sm text-gray-900 capitalize">{selectedListing.pricing_type}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedListing.location_city}, {selectedListing.location_province}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Seller & Status Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Seller & Status</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Seller</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedListing.seller.full_name}</p>
                        <p className="text-sm text-gray-500">{selectedListing.seller.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">KYC Status</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedListing.seller.kyc_status === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedListing.seller.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {selectedListing.seller.kyc_status}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Listing Status</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedListing.status)}`}>
                          {selectedListing.status}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Created</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedListing.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedListing.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Images */}
                {selectedListing.images.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedListing.images.map((image) => (
                        <img
                          key={image.id}
                          src={image.url}
                          alt={`${selectedListing.title} - Image ${image.sort_order}`}
                          className="h-24 w-full object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Inspections */}
                {selectedListing.inspections && selectedListing.inspections.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Inspection Slots</h4>
                    <div className="space-y-2">
                      {selectedListing.inspections.map((inspection) => (
                        <div key={inspection.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(inspection.slot_at).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Capacity: {inspection.capacity} | Bookings: {inspection.bookings_count}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auction Details */}
                {selectedListing.pricing_type === 'auction' && selectedListing.auction && (
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Auction Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedListing.auction.start_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedListing.auction.end_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Current Bid</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedListing.auction.current_bid 
                            ? `$${selectedListing.auction.current_bid.toFixed(2)}`
                            : 'No bids yet'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Total Bids</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedListing.auction.bid_count}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {selectedListing.status === 'active' ? (
                  <button
                    onClick={() => {
                      toggleListingStatus(selectedListing.id, 'suspended');
                      closeListingModal();
                    }}
                    disabled={processing}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    <XCircleIcon className="h-4 w-4 mr-2" />
                    {processing ? 'Processing...' : 'Suspend'}
                  </button>
                ) : selectedListing.status === 'suspended' ? (
                  <button
                    onClick={() => {
                      toggleListingStatus(selectedListing.id, 'active');
                      closeListingModal();
                    }}
                    disabled={processing}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    {processing ? 'Processing...' : 'Activate'}
                  </button>
                ) : null}
                <button
                  onClick={closeListingModal}
                  disabled={processing}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Listings Management API
Create API endpoints for listings management operations.

```typescript
// src/app/api/admin/listings/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const material = searchParams.get('material');
    const search = searchParams.get('search');

    const supabase = createClient();

    let query = supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        material,
        condition,
        quantity,
        unit,
        pricing_type,
        price_cad,
        buy_now_cad,
        location_city,
        location_province,
        status,
        created_at,
        updated_at,
        seller:profiles!seller_id(
          id,
          full_name,
          email,
          kyc_status
        ),
        listing_images(
          id,
          url,
          sort_order
        ),
        auctions(
          start_at,
          end_at,
          bids(count)
        ),
        inspections(
          id,
          slot_at,
          capacity,
          inspection_bookings(count)
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (material && material !== 'all') {
      query = query.eq('material', material);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: listings, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process the data to match the expected format
    const processedListings = listings?.map(listing => ({
      ...listing,
      images: listing.listing_images || [],
      auction: listing.auctions?.[0] ? {
        ...listing.auctions[0],
        bid_count: listing.auctions[0].bids?.[0]?.count || 0
      } : null,
      inspections: listing.inspections?.map(inspection => ({
        ...inspection,
        bookings_count: inspection.inspection_bookings?.[0]?.count || 0
      })) || []
    }));

    return NextResponse.json({ listings: processedListings });
  } catch (error) {
    console.error('Failed to get listings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Individual Listing Management API
Create API endpoint for updating individual listings.

```typescript
// src/app/api/admin/listings/[listingId]/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';
import { createNotification } from '@/lib/notification-helpers';

export async function PUT(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    // Verify admin access
    const { user: admin } = await requireAdmin();

    const { status } = await request.json();

    if (!['active', 'suspended', 'expired'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createClient();

    // Get current listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('title, status, seller_id, profiles!seller_id(full_name, email)')
      .eq('id', params.listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Update listing status
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.listingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the action in audit log
    await supabase
      .from('audit_log')
      .insert({
        actor_id: admin.id,
        action: `listing_${status}`,
        before: { status: listing.status },
        after: { status, listing_id: params.listingId }
      });

    // Notify seller of status change
    if (status === 'suspended') {
      await createNotification({
        userId: listing.seller_id,
        type: 'warning',
        title: 'Listing Suspended',
        message: `Your listing "${listing.title}" has been suspended by an administrator.`,
        link: `/listings/${params.listingId}`
      });
    } else if (status === 'active' && listing.status === 'suspended') {
      await createNotification({
        userId: listing.seller_id,
        type: 'success',
        title: 'Listing Reactivated',
        message: `Your listing "${listing.title}" has been reactivated.`,
        link: `/listings/${params.listingId}`
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Listing ${status} successfully` 
    });
  } catch (error) {
    console.error('Failed to update listing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Bulk Listings Management API
Create API endpoint for bulk operations on listings.

```typescript
// src/app/api/admin/listings/bulk/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';
import { createNotification } from '@/lib/notification-helpers';

export async function PUT(request: NextRequest) {
  try {
    // Verify admin access
    const { user: admin } = await requireAdmin();

    const { listingIds, status } = await request.json();

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return NextResponse.json({ error: 'Invalid listing IDs' }, { status: 400 });
    }

    if (!['active', 'suspended', 'expired'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createClient();

    // Get current listings details for notifications
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, status, seller_id, profiles!seller_id(full_name, email)')
      .in('id', listingIds);

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 });
    }

    // Update all listings
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .in('id', listingIds);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the bulk action in audit log
    await supabase
      .from('audit_log')
      .insert({
        actor_id: admin.id,
        action: `bulk_listing_${status}`,
        before: { listing_count: listingIds.length },
        after: { status, listing_ids: listingIds }
      });

    // Send notifications to affected sellers
    for (const listing of listings || []) {
      if (status === 'suspended') {
        await createNotification({
          userId: listing.seller_id,
          type: 'warning',
          title: 'Listing Suspended',
          message: `Your listing "${listing.title}" has been suspended by an administrator.`,
          link: `/listings/${listing.id}`
        });
      } else if (status === 'active' && listing.status === 'suspended') {
        await createNotification({
          userId: listing.seller_id,
          type: 'success',
          title: 'Listing Reactivated',
          message: `Your listing "${listing.title}" has been reactivated.`,
          link: `/listings/${listing.id}`
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${listingIds.length} listing(s) ${status} successfully`,
      updated_count: listingIds.length
    });
  } catch (error) {
    console.error('Failed to bulk update listings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Files Created/Modified

### New Files
- `src/app/admin/listings/page.tsx` - Admin listings moderation interface
- `src/app/api/admin/listings/route.ts` - Listings management API
- `src/app/api/admin/listings/[listingId]/route.ts` - Individual listing management API
- `src/app/api/admin/listings/bulk/route.ts` - Bulk listings operations API

### Modified Files
- Admin navigation includes listings management link

## Database Requirements
- Existing `listings` table from T007
- Existing `listing_images` table from T007
- Existing `auctions` table from T008
- Existing `bids` table from T008
- Existing `inspections` table from T010
- Existing `inspection_bookings` table from T010
- Existing `profiles` table from T006
- Existing `audit_log` table from T018

## Success Metrics
- [ ] Admin can view all listings with filtering and search
- [ ] Admin can filter by status, material, and search terms
- [ ] Admin can view detailed listing information in modal
- [ ] Admin can toggle individual listing status (active/suspended)
- [ ] Admin can perform bulk operations on selected listings
- [ ] Sellers receive notifications when listings are suspended/reactivated
- [ ] All moderation actions are logged in audit trail
- [ ] Listing images display correctly in the interface
- [ ] Inspection slots and auction details show when applicable
- [ ] Mobile-responsive listings management interface

## Testing Checklist
- [ ] Listings load correctly with all associated data
- [ ] Search functionality works across title and description
- [ ] Status and material filters work correctly
- [ ] Individual listing status toggle works
- [ ] Bulk selection and operations work correctly
- [ ] Listing detail modal displays all information
- [ ] Seller notifications are sent for status changes
- [ ] Audit log entries are created for all actions
- [ ] Non-admin users cannot access listings management API
- [ ] Image thumbnails display correctly in listings table
- [ ] Auction and inspection data displays when present
- [ ] Mobile interface is usable and responsive
