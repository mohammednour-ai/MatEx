'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

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

interface BrowseFiltersProps {
  searchParams: SearchParams
}

const MATERIAL_OPTIONS = [
  'Steel', 'Aluminum', 'Copper', 'Brass', 'Iron', 'Stainless Steel',
  'Plastic', 'PVC', 'HDPE', 'PET', 'Polystyrene',
  'Paper', 'Cardboard', 'Newsprint',
  'Glass', 'Tempered Glass',
  'Wood', 'Lumber', 'Plywood', 'MDF',
  'Concrete', 'Asphalt', 'Brick',
  'Electronics', 'Circuit Boards', 'Cables',
  'Textiles', 'Cotton', 'Polyester', 'Wool',
  'Rubber', 'Tires',
  'Other'
]

const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'scrap', label: 'Scrap' }
]

const PRICING_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'auction', label: 'Auction' }
]

const PROVINCE_OPTIONS = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'
]

export default function BrowseFilters({ searchParams }: BrowseFiltersProps) {
  const router = useRouter()
  const urlSearchParams = useSearchParams()
  
  const [filters, setFilters] = useState({
    material: searchParams.material || '',
    condition: searchParams.condition || '',
    pricing_type: searchParams.pricing_type || '',
    location_city: searchParams.location_city || '',
    location_province: searchParams.location_province || '',
    min_price: searchParams.min_price || '',
    max_price: searchParams.max_price || '',
    search: searchParams.search || ''
  })

  const updateURL = useCallback((newFilters: typeof filters) => {
    const params = new URLSearchParams(urlSearchParams.toString())
    
    // Update or remove parameters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    // Preserve sort parameter
    if (searchParams.sort) {
      params.set('sort', searchParams.sort)
    }

    // Reset to page 1 when filters change
    params.delete('page')

    router.push(`/browse?${params.toString()}`)
  }, [router, urlSearchParams, searchParams.sort])

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    updateURL(newFilters)
  }

  const clearAllFilters = () => {
    const clearedFilters = {
      material: '',
      condition: '',
      pricing_type: '',
      location_city: '',
      location_province: '',
      min_price: '',
      max_price: '',
      search: ''
    }
    setFilters(clearedFilters)
    updateURL(clearedFilters)
  }

  const hasActiveFilters = Object.values(filters).some(value => value && value.trim() !== '')

  return (
    <form id="filters-form" className="space-y-6">
      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Active Filters</span>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-sm text-primary hover:text-primary-dark flex items-center"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            Clear All
          </button>
        </div>
      )}

      {/* Material Filter */}
      <div>
        <label htmlFor="material" className="block text-sm font-medium text-gray-700 mb-2">
          Material Type
        </label>
        <select
          id="material"
          name="material"
          value={filters.material}
          onChange={(e) => handleFilterChange('material', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Materials</option>
          {MATERIAL_OPTIONS.map(material => (
            <option key={material} value={material}>{material}</option>
          ))}
        </select>
      </div>

      {/* Condition Filter */}
      <div>
        <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
          Condition
        </label>
        <select
          id="condition"
          name="condition"
          value={filters.condition}
          onChange={(e) => handleFilterChange('condition', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Conditions</option>
          {CONDITION_OPTIONS.map(condition => (
            <option key={condition.value} value={condition.value}>{condition.label}</option>
          ))}
        </select>
      </div>

      {/* Pricing Type Filter */}
      <div>
        <label htmlFor="pricing_type" className="block text-sm font-medium text-gray-700 mb-2">
          Pricing Type
        </label>
        <select
          id="pricing_type"
          name="pricing_type"
          value={filters.pricing_type}
          onChange={(e) => handleFilterChange('pricing_type', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Types</option>
          {PRICING_TYPE_OPTIONS.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price Range (CAD)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.min_price}
            onChange={(e) => handleFilterChange('min_price', e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            min="0"
            step="0.01"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.max_price}
            onChange={(e) => handleFilterChange('max_price', e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Location Filters */}
      <div>
        <label htmlFor="location_province" className="block text-sm font-medium text-gray-700 mb-2">
          Province
        </label>
        <select
          id="location_province"
          name="location_province"
          value={filters.location_province}
          onChange={(e) => handleFilterChange('location_province', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Provinces</option>
          {PROVINCE_OPTIONS.map(province => (
            <option key={province} value={province}>{province}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="location_city" className="block text-sm font-medium text-gray-700 mb-2">
          City
        </label>
        <input
          type="text"
          id="location_city"
          name="location_city"
          placeholder="Enter city name"
          value={filters.location_city}
          onChange={(e) => handleFilterChange('location_city', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (!value || value.trim() === '') return null
              
              let displayValue = value
              if (key === 'condition') {
                const conditionOption = CONDITION_OPTIONS.find(c => c.value === value)
                displayValue = conditionOption?.label || value
              } else if (key === 'pricing_type') {
                const pricingOption = PRICING_TYPE_OPTIONS.find(p => p.value === value)
                displayValue = pricingOption?.label || value
              } else if (key === 'min_price') {
                displayValue = `Min: $${value}`
              } else if (key === 'max_price') {
                displayValue = `Max: $${value}`
              }

              return (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {displayValue}
                  <button
                    type="button"
                    onClick={() => handleFilterChange(key, '')}
                    className="ml-1.5 h-3 w-3 rounded-full inline-flex items-center justify-center hover:bg-primary/20"
                  >
                    <XMarkIcon className="h-2 w-2" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </form>
  )
}
