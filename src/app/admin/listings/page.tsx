'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from '@/components/LoadingSkeletons';

interface Listing {
  id: string;
  title: string;
  material: string;
  condition: string;
  price_cad: number;
  status: string;
  seller_name: string;
  created_at: string;
}

export default function AdminListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/admin/listings');
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings || []);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateListingStatus = async (listingId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingIds: [listingId], status }),
      });
      if (response.ok) fetchListings();
    } catch (error) {
      console.error('Error updating listing:', error);
    }
  };

  if (loading) return <TableSkeleton rows={10} columns={6} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Listings Moderation</h1>
        <p className="mt-2 text-sm text-gray-700">Manage and moderate platform listings</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{listing.title}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{listing.material}</td>
                <td className="px-6 py-4 text-sm text-gray-500">${listing.price_cad}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    listing.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {listing.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{listing.seller_name}</td>
                <td className="px-6 py-4 text-sm font-medium space-x-2">
                  <button
                    onClick={() => updateListingStatus(listing.id, listing.status === 'active' ? 'inactive' : 'active')}
                    className="text-brand-600 hover:text-brand-900"
                  >
                    {listing.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
