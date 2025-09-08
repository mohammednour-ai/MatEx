'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from 'recharts';
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

// Types
interface PriceTrendData {
  week_start: string;
  week_end: string;
  avg_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  volume_kg: number;
  auction_count: number;
}

interface PriceTrendStatistics {
  total_weeks: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  total_volume: number;
  avg_weekly_volume: number;
  total_auctions: number;
}

interface PriceTrendResponse {
  material: string;
  date_range: {
    start?: string;
    end?: string;
    limit: number;
  };
  trends: PriceTrendData[];
  statistics: PriceTrendStatistics;
}

interface Material {
  material: string;
  latest_week: string;
  total_weeks: number;
  avg_weekly_volume: number;
  latest_avg_price: number;
}

interface PriceTrendChartProps {
  material?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  height?: number;
  showControls?: boolean;
  chartType?: 'line' | 'area' | 'bar';
  className?: string;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">
          Week of {new Date(label).toLocaleDateString('en-CA', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
        <div className="space-y-1 text-sm">
          <p className="text-brand-600">
            <span className="font-medium">Avg Price:</span> ${data.avg_price?.toFixed(2)} CAD
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Median:</span> ${data.median_price?.toFixed(2)} CAD
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Range:</span> ${data.min_price?.toFixed(2)} - ${data.max_price?.toFixed(2)} CAD
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Volume:</span> {data.volume_kg?.toLocaleString()} kg
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Auctions:</span> {data.auction_count}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Statistics card component
const StatCard = ({ title, value, change, icon: Icon }: {
  title: string;
  value: string;
  change?: { value: number; isPositive: boolean };
  icon: React.ComponentType<any>;
}) => (
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <div className={`flex items-center mt-1 text-sm ${
            change.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {change.isPositive ? (
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
            ) : (
              <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
            )}
            {Math.abs(change.value).toFixed(1)}%
          </div>
        )}
      </div>
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
  </div>
);

export default function PriceTrendChart({
  material,
  startDate,
  endDate,
  limit = 52,
  height = 400,
  showControls = true,
  chartType = 'line',
  className = '',
}: PriceTrendChartProps) {
  const [data, setData] = useState<PriceTrendResponse | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState(material || '');
  const [selectedChartType, setSelectedChartType] = useState<'line' | 'area' | 'bar'>(chartType);
  const [dateRange, setDateRange] = useState({
    start: startDate || '',
    end: endDate || '',
  });

  // Fetch materials list
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await fetch('/api/price-trends?materials=true');
        const result = await response.json();

        if (result.success) {
          setMaterials(result.data.materials);
          if (!selectedMaterial && result.data.materials.length > 0) {
            setSelectedMaterial(result.data.materials[0].material);
          }
        }
      } catch (err) {
        console.error('Error fetching materials:', err);
      }
    };

    fetchMaterials();
  }, [selectedMaterial]);

  // Fetch price trends data
  useEffect(() => {
    if (!selectedMaterial) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          material: selectedMaterial,
          limit: limit.toString(),
        });

        if (dateRange.start) params.append('start_date', dateRange.start);
        if (dateRange.end) params.append('end_date', dateRange.end);

        const response = await fetch(`/api/price-trends?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch price trends');
        }
      } catch (err) {
        setError('Network error occurred');
        console.error('Error fetching price trends:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMaterial, dateRange.start, dateRange.end, limit]);

  // Format data for charts
  const chartData = data?.trends.map(trend => ({
    ...trend,
    date: new Date(trend.week_start).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric'
    }),
    week_start: trend.week_start,
  })).reverse() || [];

  // Calculate price change
  const priceChange = chartData.length >= 2 ? {
    value: ((chartData[chartData.length - 1].avg_price - chartData[0].avg_price) / chartData[0].avg_price) * 100,
    isPositive: chartData[chartData.length - 1].avg_price >= chartData[0].avg_price,
  } : undefined;

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (selectedChartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="avg_price"
              stroke="#0ea5e9"
              fill="#0ea5e9"
              fillOpacity={0.1}
              strokeWidth={2}
              name="Average Price (CAD)"
            />
            <Area
              type="monotone"
              dataKey="median_price"
              stroke="#eab308"
              fill="#eab308"
              fillOpacity={0.1}
              strokeWidth={2}
              name="Median Price (CAD)"
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="avg_price"
              fill="#0ea5e9"
              name="Average Price (CAD)"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="avg_price"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2 }}
              name="Average Price (CAD)"
            />
            <Line
              type="monotone"
              dataKey="median_price"
              stroke="#eab308"
              strokeWidth={2}
              dot={{ fill: '#eab308', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#eab308', strokeWidth: 2 }}
              name="Median Price (CAD)"
            />
          </LineChart>
        );
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-12">
          <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Chart</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-12">
          <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Price Data Available</h3>
          <p className="text-gray-600">
            {selectedMaterial ? `No historical data found for ${selectedMaterial}` : 'Select a material to view price trends'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Price Trends - {data.material}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {data.statistics.total_weeks} weeks of data • {data.statistics.total_auctions} auctions
          </p>
        </div>

        {showControls && (
          <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
            {/* Material selector */}
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              {materials.map((mat) => (
                <option key={mat.material} value={mat.material}>
                  {mat.material} (${mat.latest_avg_price?.toFixed(2)})
                </option>
              ))}
            </select>

            {/* Chart type selector */}
            <select
              value={selectedChartType}
              onChange={(e) => setSelectedChartType(e.target.value as 'line' | 'area' | 'bar')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Average Price"
          value={`$${data.statistics.avg_price.toFixed(2)}`}
          change={priceChange}
          icon={ChartBarIcon}
        />
        <StatCard
          title="Price Range"
          value={`$${data.statistics.min_price.toFixed(2)} - $${data.statistics.max_price.toFixed(2)}`}
          icon={ArrowTrendingUpIcon}
        />
        <StatCard
          title="Total Volume"
          value={`${data.statistics.total_volume.toLocaleString()} kg`}
          icon={ChartBarIcon}
        />
        <StatCard
          title="Weekly Avg Volume"
          value={`${data.statistics.avg_weekly_volume.toLocaleString()} kg`}
          icon={ChartBarIcon}
        />
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Data shows weekly averages from completed auctions. Prices in CAD.
      </div>
    </div>
  );
}
