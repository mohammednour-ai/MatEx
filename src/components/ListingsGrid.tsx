import Link from 'next/link'
import Image from 'next/image'
import { ClockIcon, MapPinIcon, EyeIcon } from '@heroicons/react/24/outline'

interface Listing {
  id: string
  title: string
  description: string
  material: string
  condition: string
  quantity: number
  unit: string
  pricing_type: 'fixed' | 'auction'
  price_cad: number
  buy_now_cad: number
  location_city: string
  location_province: string
  status: string
  featured: boolean
  views_count: number
  created_at: string
  listing_images: Array<{
    url: string
    is_primary: boolean
  }>
  profiles: {
    full_name: string
    company_name: string
  }
}

interface ListingsGridProps {
  listings: Listing[]
}

export default function ListingsGrid({ listings }: ListingsGridProps) {
  if (listings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
        <p className="text-gray-600 mb-6">
          Try adjusting your search criteria or filters to find what you're looking for.
        </p>
        <Link
          href="/browse"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
        >
          Clear All Filters
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {listings.map((listing) => {
        const primaryImage = listing.listing_images?.find(img => img.is_primary)?.url || listing.listing_images?.[0]?.url
        const displayPrice = listing.pricing_type === 'fixed' ? listing.price_cad : listing.buy_now_cad
        
        return (
          <div key={listing.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${listing.featured ? 'ring-2 ring-accent ring-opacity-50' : ''}`}>
            {/* Featured Badge */}
            {listing.featured && (
              <div className="absolute top-2 left-2 z-10">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-white">
                  Featured
                </span>
              </div>
            )}

            {/* Image */}
            <div className="relative h-48 bg-gray-200">
              {primaryImage ? (
                <Image
                  src={primaryImage}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-1 text-sm text-gray-500">No image</p>
                  </div>
                </div>
              )}
              
              {/* Pricing Type Badge */}
              <div className="absolute top-2 right-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  listing.pricing_type === 'auction' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {listing.pricing_type === 'auction' ? 'Auction' : 'Fixed Price'}
                </span>
              </div>
            </div>

            <div className="p-6">
              {/* Title and Material */}
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                  {listing.title}
                </h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{listing.material}</span>
                  <span className="mx-2">•</span>
                  <span className="capitalize">{listing.condition.replace('_', ' ')}</span>
                </p>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {listing.description}
              </p>

              {/* Quantity and Price */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Quantity:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {listing.quantity.toLocaleString()} {listing.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {listing.pricing_type === 'auction' ? 'Buy Now:' : 'Price:'}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    ${displayPrice?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Location and Stats */}
              <div className="mb-4 space-y-1">
                <div className="flex items-center text-sm text-gray-500">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  {listing.location_city}, {listing.location_province}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center">
                    <EyeIcon className="h-3 w-3 mr-1" />
                    {listing.views_count} views
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {formatTimeAgo(listing.created_at)}
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Seller:</span> {listing.profiles.full_name}
                  {listing.profiles.company_name && (
                    <span className="text-gray-500"> • {listing.profiles.company_name}</span>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Link
                  href={`/listings/${listing.id}`}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white text-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  View Details
                </Link>
                {listing.pricing_type === 'auction' && (
                  <Link
                    href={`/listings/${listing.id}#bid`}
                    className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Bid
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  } else {
    return date.toLocaleDateString('en-CA', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
}
