'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  ShoppingCartIcon,
  PackageIcon,
  DollarSignIcon,
  ActivityIcon,
  RefreshIcon
} from './Icons';

interface DashboardMetrics {
  active_auctions: number;
  weekly_trading_volume: number;
  new_sellers_count: number;
  returning_buyers_count: number;
  total_materials: number;
  avg_auction_value: number;
  completion_rate: number;
  last_updated: string;
}

interface TradingVolumeData {
  week_start: string;
  total_volume: number;
  auction_count: number;
  avg_value: number;
  unique_sellers: number;
  unique_buyers: number;
}

interface DashboardResponse {
  metrics: DashboardMetrics;
  history?: TradingVolumeData[];
  period: number;
  generated_at: string;
}

interface KPITileProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  loading?: boolean;
}

const KPITile: React.FC<KPITileProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  color,
  loading = false
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  };

  const iconBgClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100',
    indigo: 'bg-indigo-100',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className="flex items-center text-sm">
              {change >= 0 ? (
                <TrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(change)}%
              </span>
              {changeLabel && (
                <span className="text-gray-500 ml-1">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgClasses[color]}`}>
          <div className={colorClasses[color].split(' ')[1]}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

interface DashboardKPITilesProps {
  period?: number;
  includeHistory?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

const DashboardKPITiles: React.FC<DashboardKPITilesProps> = ({
  period = 4,
  includeHistory = false,
  autoRefresh = true,
  refreshInterval = 5 * 60 * 1000, // 5 minutes
  className = ''
}) => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      if (!data) setLoading(true);

      const params = new URLSearchParams({
        period: period.toString(),
        history: includeHistory.toString(),
      });

      const response = await fetch(`/api/analytics/dashboard?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: DashboardResponse = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period, includeHistory]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Dashboard</h3>
            <p className="text-red-600">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trading Dashboard</h2>
          <p className="text-gray-600">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* KPI Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPITile
          title="Active Auctions"
          value={metrics?.active_auctions || 0}
          icon={<ShoppingCartIcon className="w-6 h-6" />}
          color="blue"
          loading={loading}
        />

        <KPITile
          title="Weekly Trading Volume"
          value={metrics ? formatCurrency(metrics.weekly_trading_volume) : '$0'}
          icon={<TrendingUpIcon className="w-6 h-6" />}
          color="green"
          loading={loading}
        />

        <KPITile
          title="New Sellers"
          value={metrics?.new_sellers_count || 0}
          changeLabel="this week"
          icon={<UsersIcon className="w-6 h-6" />}
          color="purple"
          loading={loading}
        />

        <KPITile
          title="Returning Buyers"
          value={metrics?.returning_buyers_count || 0}
          changeLabel="this week"
          icon={<ActivityIcon className="w-6 h-6" />}
          color="orange"
          loading={loading}
        />

        <KPITile
          title="Total Materials"
          value={metrics?.total_materials || 0}
          icon={<PackageIcon className="w-6 h-6" />}
          color="indigo"
          loading={loading}
        />

        <KPITile
          title="Avg Auction Value"
          value={metrics ? formatCurrency(metrics.avg_auction_value) : '$0'}
          icon={<DollarSignIcon className="w-6 h-6" />}
          color="green"
          loading={loading}
        />

        <KPITile
          title="Completion Rate"
          value={metrics ? formatPercentage(metrics.completion_rate) : '0%'}
          icon={<TrendingUpIcon className="w-6 h-6" />}
          color="blue"
          loading={loading}
        />

        <KPITile
          title="Period"
          value={`${period} weeks`}
          icon={<ActivityIcon className="w-6 h-6" />}
          color="red"
          loading={loading}
        />
      </div>

      {/* Historical Data Summary */}
      {includeHistory && data?.history && data.history.length > 0 && (
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {data.history.reduce((sum, week) => sum + week.total_volume, 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Total Volume ({period} weeks)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {data.history.reduce((sum, week) => sum + week.auction_count, 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Total Auctions ({period} weeks)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(
                  data.history.reduce((sum, week) => sum + week.avg_value, 0) / data.history.length
                )}
              </p>
              <p className="text-sm text-gray-600">Avg Weekly Value</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardKPITiles;
