import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabaseServer'
import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import BrowseFilters from '@/components/BrowseFilters'
import ListingsGrid from '@/components/ListingsGrid'
import Pagination from '@/components/Pagination'

interface SearchParams {
  material?: string
  condition?: string
  pricing_type?: string
  location_city?: string
  location_province?: string
  min_price?: string
  max_price?: string
  sort?: string
  page?: string
  search?: string
}

interface BrowsePageProps {
  searchParams: SearchParams
}

const ITEMS_PER_PAGE = 12

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const supabase = supabaseServer
  
  // Parse search parameters
  const {
    material,
    condition,
    pricing_type,
    location_city,
    location_province,
    min_price,
    max_price,
    sort = 'created_at-desc',
    page = '1',
    search
  } = searchParams

  const currentPage = parseInt(page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE
  const [sortField, sortOrder] = sort.split('-')

  // Build query for listings with filters
  let query = supabase
    .from('listings')
    .select(`
      *,
      listing_images!inner(url, is_primary),
      profiles!seller_id(
        full_name,
        company_name
      )
    `, { count: 'exact' })
    .eq('status', 'active')

  // Apply filters
  if (material) {
    query = query.ilike('material', `%${material}%`)
  }

  if (condition) {
    query = query.eq('condition', condition)
  }

  if (pricing_type) {
    query = query.eq('pricing_type', pricing_type)
  }

  if (location_city) {
    query = query.ilike('location_city', `%${location_city}%`)
  }

  if (location_province) {
    query = query.eq('location_province', location_province)
  }

  if (min_price) {
    const minPriceNum = parseFloat(min_price)
    if (!isNaN(minPriceNum)) {
      query = query.gte('price_cad', minPriceNum)
    }
  }

  if (max_price) {
    const maxPriceNum = parseFloat(max_price)
    if (!isNaN(maxPriceNum)) {
      query = query.lte('price_cad', maxPriceNum)
    }
  }

  // Apply search
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,material.ilike.%${search}%`)
  }

  // Apply sorting
  const validSortFields = ['created_at', 'price_cad', 'title', 'quantity', 'views_count']
  const finalSortField = validSortFields.includes(sortField) ? sortField : 'created_at'
  const finalSortOrder = sortOrder === 'asc' ? true : false

  query = query.order(finalSortField, { ascending: finalSortOrder })

  // Apply pagination
  query = query.range(offset, offset + ITEMS_PER_PAGE - 1)

  const { data: listings, error, count } = await query

  if (error) {
    console.error('Error fetching listings:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Listings</h1>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Materials</h1>
          <p className="text-gray-600">
            Discover quality materials from verified sellers across Canada
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 lg:mb-0">
              <div className="flex items-center mb-4">
                <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Filters</h2>
              </div>
              <Suspense fallback={<div>Loading filters...</div>}>
                <BrowseFilters searchParams={searchParams} />
              </Suspense>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search materials, descriptions..."
                  defaultValue={search || ''}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  name="search"
                  form="filters-form"
                />
              </div>
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-700">
                  Showing {offset + 1}-{Math.min(offset + ITEMS_PER_PAGE, count || 0)} of {count || 0} results
                </p>
              </div>
              
              {/* Sort Dropdown */}
              <div className="flex items-center space-x-2">
                <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                  Sort by:
                </label>
                <select
                  id="sort"
                  name="sort"
                  defaultValue={sort}
                  form="filters-form"
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="price_cad-asc">Price: Low to High</option>
                  <option value="price_cad-desc">Price: High to Low</option>
                  <option value="title-asc">Title: A to Z</option>
                  <option value="title-desc">Title: Z to A</option>
                  <option value="views_count-desc">Most Popular</option>
                  <option value="quantity-desc">Largest Quantity</option>
                </select>
              </div>
            </div>

            {/* Listings Grid */}
            <Suspense fallback={<ListingsGridSkeleton />}>
              <ListingsGrid listings={listings || []} />
            </Suspense>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  searchParams={searchParams}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading skeleton for listings grid
function ListingsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-48 bg-gray-200 animate-pulse" />
          <div className="p-6">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 bg-gray-200 rounded animate-pulse mb-4 w-3/4" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const metadata = {
  title: 'Browse Materials - MatEx',
  description: 'Browse quality materials from verified sellers across Canada',
}
