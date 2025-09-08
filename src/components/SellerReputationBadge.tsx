'use client';

import { useState, useEffect } from 'react';
import { StarIcon, TrendingUpIcon, TrendingDownIcon, InfoIcon } from './Icons';

interface ReputationData {
  seller_id: string;
  score: number;
  total_orders: number;
  fulfilled_orders: number;
  fulfillment_rate: number;
  avg_fulfillment_days: number | null;
  dispute_count: number;
  cancellation_count: number;
  badge_level: string;
  last_calculated_at: string;
}

interface SellerReputationBadgeProps {
  sellerId: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeConfig = {
  excellent: {
    label: 'Excellent Seller',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: '⭐',
    description: 'Outstanding performance with high customer satisfaction'
  },
  'very-good': {
    label: 'Very Good Seller',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '✨',
    description: 'Consistently good performance and reliability'
  },
  good: {
    label: 'Good Seller',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '👍',
    description: 'Reliable seller with good track record'
  },
  fair: {
    label: 'Fair Seller',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⚖️',
    description: 'Average performance, room for improvement'
  },
  poor: {
    label: 'Poor Seller',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '⚠️',
    description: 'Below average performance, proceed with caution'
  },
  'very-poor': {
    label: 'Very Poor Seller',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '❌',
    description: 'Poor performance history, high risk'
  }
};

const sizeConfig = {
  sm: {
    badge: 'px-2 py-1 text-xs',
    icon: 'text-sm',
    score: 'text-xs font-medium'
  },
  md: {
    badge: 'px-3 py-1.5 text-sm',
    icon: 'text-base',
    score: 'text-sm font-semibold'
  },
  lg: {
    badge: 'px-4 py-2 text-base',
    icon: 'text-lg',
    score: 'text-base font-bold'
  }
};

export default function SellerReputationBadge({
  sellerId,
  showDetails = false,
  size = 'md',
  className = ''
}: SellerReputationBadgeProps) {
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetchReputation();
  }, [sellerId]);

  const fetchReputation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/reputation/${sellerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reputation');
      }

      const data = await response.json();
      setReputation(data);
    } catch (err) {
      console.error('Error fetching reputation:', err);
      setError('Failed to load reputation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`inline-flex items-center ${sizeConfig[size].badge} bg-gray-100 text-gray-400 rounded-full border animate-pulse ${className}`}>
        <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !reputation) {
    return (
      <div className={`inline-flex items-center ${sizeConfig[size].badge} bg-gray-100 text-gray-500 rounded-full border ${className}`}>
        <InfoIcon className={`${sizeConfig[size].icon} mr-1`} />
        <span>No Rating</span>
      </div>
    );
  }

  const config = badgeConfig[reputation.badge_level as keyof typeof badgeConfig] || badgeConfig.fair;
  const stars = Math.round(reputation.score);

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`inline-flex items-center ${sizeConfig[size].badge} ${config.color} rounded-full border cursor-pointer transition-all hover:shadow-sm`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={`${sizeConfig[size].icon} mr-1`}>{config.icon}</span>
        <span className={sizeConfig[size].score}>
          {reputation.score.toFixed(1)}
        </span>
        <div className="flex ml-1">
          {[...Array(5)].map((_, i) => (
            <StarIcon
              key={i}
              className={`w-3 h-3 ${
                i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 p-4 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="text-sm">
            <div className="font-semibold text-gray-900 mb-2">
              {config.label} ({reputation.score.toFixed(2)}/5.0)
            </div>
            <div className="text-gray-600 mb-3">
              {config.description}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Orders:</span>
                <span className="font-medium">{reputation.total_orders}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Fulfillment Rate:</span>
                <span className="font-medium">{reputation.fulfillment_rate.toFixed(1)}%</span>
              </div>

              {reputation.avg_fulfillment_days && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg. Fulfillment:</span>
                  <span className="font-medium">{reputation.avg_fulfillment_days.toFixed(1)} days</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-500">Disputes:</span>
                <span className="font-medium">{reputation.dispute_count}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Cancellations:</span>
                <span className="font-medium">{reputation.cancellation_count}</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
              Updated: {new Date(reputation.last_calculated_at).toLocaleDateString()}
            </div>
          </div>

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
        </div>
      )}

      {/* Detailed view */}
      {showDetails && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-semibold text-gray-900 mb-3">Seller Performance Details</h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Score:</span>
                <span className="font-medium">{reputation.score.toFixed(2)}/5.0</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Total Orders:</span>
                <span className="font-medium">{reputation.total_orders}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Fulfilled:</span>
                <span className="font-medium">{reputation.fulfilled_orders}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-medium">{reputation.fulfillment_rate.toFixed(1)}%</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Disputes:</span>
                <span className="font-medium">{reputation.dispute_count}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Cancellations:</span>
                <span className="font-medium">{reputation.cancellation_count}</span>
              </div>
            </div>
          </div>

          {reputation.avg_fulfillment_days && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Average Fulfillment Time:</span>
                <span className="font-medium">{reputation.avg_fulfillment_days.toFixed(1)} days</span>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
            Last updated: {new Date(reputation.last_calculated_at).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}
