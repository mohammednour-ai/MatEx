'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Listing {
  id: string
  title: string
  description: string
  material_type: string
  category: string
  quantity: number
  unit: string
  price_per_unit: number
  total_price: number
  location: string
  condition: string
  availability_date: string
  expiry_date: string
  status: 'draft' | 'active' | 'sold' | 'expired' | 'suspended'
  seller_id: string
  seller_name: string
  seller_company: string
  images: string[]
  created_at: string
  updated_at: string
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  role: 'buyer' | 'seller' | 'both' | 'admin'
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'all' | 'my-listings'>('all')
  
  const router = useRouter()

  const categories = [
    'Metals', 'Plastics', 'Paper & Cardboard', 'Electronics', 'Textiles',
    'Glass', 'Wood', 'Chemicals', 'Construction Materials', 'Other'
  ]

  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor']

  useEffect(() => {
    loadData()
  }, [viewMode, selectedCategory, selectedCondition, sortBy, sortOrder])

  const loadData = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        router.push('/login')
        return
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('Profile load error:', profileError)
        return
      }

      setProfile(profileData)

      // Build query for listings
      let query = supabase
        .from('listings')
        .select(`
          *,
          profiles!seller_id (
            first_name,
            last_name,
            company_name
          )
        `)

      // Apply filters
      if (viewMode === 'my-listings') {
        query = query.eq('seller_id', session.user.id)
      } else {
        query = query.eq('status', 'active')
      }

      if (selectedCategory) {
        query = query.eq('category', selectedCategory)
      }

      if (selectedCondition) {
        query = query.eq('condition', selectedCondition)
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      const { data: listingsData, error: listingsError } = await query

      if (listingsError) {
        console.error('Listings load error:', listingsError)
        return
      }

      // Transform data to match interface
      const transformedListings = listingsData?.map(listing => ({
        ...listing,
        seller_name: `${listing.profiles?.first_name || ''} ${listing.profiles?.last_name || ''}`.trim(),
        seller_company: listing.profiles?.company_name || '',
        images: listing.images || []
      })) || []

      setListings(transformedListings)

    } catch (err) {
      console.error('Data load exception:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.material_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      sold: 'bg-blue-100 text-blue-800',
      expired: 'bg-red-100 text-red-800',
      suspended: 'bg-yellow-100 text-yellow-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const canCreateListing = profile?.role === 'seller' || profile?.role === 'both' || profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Material Listings</h1>
              <p className="mt-2 text-sm text-gray-600">
                Browse available materials or manage your own listings
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ← Back to Dashboard
              </Link>
              {canCreateListing && (
                <Link
                  href="/listings/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Listing
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {/* View Mode Toggle */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
                <div className="flex rounded-md shadow-sm">
                  <button
                    onClick={() => setViewMode('all')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                      viewMode === 'all'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    All Listings
                  </button>
                  <button
                    onClick={() => setViewMode('my-listings')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                      viewMode === 'my-listings'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    My Listings
                  </button>
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search listings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Condition Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All Conditions</option>
                  {conditions.map(condition => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-')
                    setSortBy(field)
                    setSortOrder(order as 'asc' | 'desc')
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="price_per_unit-asc">Price: Low to High</option>
                  <option value="price_per_unit-desc">Price: High to Low</option>
                  <option value="title-asc">Title: A to Z</option>
                  <option value="title-desc">Title: Z to A</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-700">
            Showing {filteredListings.length} of {listings.length} listings
          </p>
        </div>

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <div className="bg-white shadow rounded-lg">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {viewMode === 'my-listings' ? 'No listings found' : 'No materials available'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {viewMode === 'my-listings' 
                  ? 'Get started by creating your first listing.'
                  : 'Try adjusting your search criteria or check back later.'
                }
              </p>
              {viewMode === 'my-listings' && canCreateListing && (
                <div className="mt-6">
                  <Link
                    href="/listings/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Your First Listing
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
                {/* Image placeholder */}
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-1 text-sm text-gray-500">No image</p>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900 truncate flex-1 mr-2">
                      {listing.title}
                    </h3>
                    {getStatusBadge(listing.status)}
                  </div>

                  {/* Material Info */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">{listing.material_type}</span> • {listing.category}
                    </p>
                    <p className="text-sm text-gray-500">
                      Condition: {listing.condition}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {listing.description}
                  </p>

                  {/* Quantity and Price */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-500">Quantity:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {listing.quantity.toLocaleString()} {listing.unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-500">Price per {listing.unit}:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatPrice(listing.price_per_unit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Total:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {formatPrice(listing.total_price)}
                      </span>
                    </div>
                  </div>

                  {/* Location and Date */}
                  <div className="mb-4 text-sm text-gray-500">
                    <p>📍 {listing.location}</p>
                    <p>📅 Available: {formatDate(listing.availability_date)}</p>
                  </div>

                  {/* Seller Info */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Seller:</span> {listing.seller_name}
                      {listing.seller_company && (
                        <span className="text-gray-500"> • {listing.seller_company}</span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link
                      href={`/listings/${listing.id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      View Details
                    </Link>
                    {viewMode === 'my-listings' && (
                      <Link
                        href={`/listings/${listing.id}/edit`}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
