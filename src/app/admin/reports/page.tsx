'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/components/Spinners';

interface ReportType {
  id: string;
  name: string;
  description: string;
}

interface ReportFilters {
  materials: string[];
  date_range: {
    earliest: string;
    latest: string;
  };
}

interface ReportInfo {
  report_types: ReportType[];
  filters: ReportFilters;
}

export default function ReportsPage() {
  const [reportInfo, setReportInfo] = useState<ReportInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [includeDetails, setIncludeDetails] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  // Load report information on component mount
  useEffect(() => {
    loadReportInfo();
  }, []);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const loadReportInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/reports/export', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to load report information');
      }

      const result = await response.json();
      setReportInfo(result.data);

      // Set default date range to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);

    } catch (error) {
      console.error('Failed to load report info:', error);
      showMessage('Failed to load report information', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedReport) {
      showMessage('Please select a report type', 'error');
      return;
    }

    try {
      setExporting(true);

      // Build query parameters
      const params = new URLSearchParams({
        report_type: selectedReport,
        format: 'csv'
      });

      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedMaterial) params.append('material', selectedMaterial);
      if (includeDetails) params.append('include_details', 'true');

      // Make request to export API
      const response = await fetch(`/api/admin/reports/export?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'report.csv';

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showMessage(`Report exported successfully: ${filename}`, 'success');

    } catch (error) {
      console.error('Export failed:', error);
      showMessage(error instanceof Error ? error.message : 'Unknown error occurred', 'error');
    } finally {
      setExporting(false);
    }
  };

  const getReportIcon = (reportId: string) => {
    switch (reportId) {
      case 'price_trends':
        return '📊';
      case 'trading_volume':
        return '💰';
      case 'seller_performance':
        return '👥';
      case 'auction_summary':
        return '⏰';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export Reports</h1>
          <p className="text-gray-600">Generate and download CSV reports for analytics and compliance</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Export Reports</h1>
        <p className="text-gray-600">Generate and download CSV reports for analytics and compliance</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          messageType === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h2>

            <div className="space-y-6">
              {/* Report Type Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Report Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reportInfo?.report_types.map((report) => (
                    <div
                      key={report.id}
                      className={`relative rounded-lg border p-4 cursor-pointer transition-colors ${
                        selectedReport === report.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedReport(report.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">
                          {getReportIcon(report.id)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900">{report.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedReport === report.id
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedReport === report.id && (
                              <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start-date" className="text-sm font-medium text-gray-700 block mb-1">
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={reportInfo?.filters.date_range.earliest?.split('T')[0]}
                    max={endDate || reportInfo?.filters.date_range.latest?.split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="text-sm font-medium text-gray-700 block mb-1">
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || reportInfo?.filters.date_range.earliest?.split('T')[0]}
                    max={reportInfo?.filters.date_range.latest?.split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Material Filter */}
              <div>
                <label htmlFor="material" className="text-sm font-medium text-gray-700 block mb-1">
                  Material Type (Optional)
                </label>
                <select
                  id="material"
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Materials</option>
                  {reportInfo?.filters.materials.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Options */}
              <div>
                <div className="flex items-center space-x-2">
                  <input
                    id="include-details"
                    type="checkbox"
                    checked={includeDetails}
                    onChange={(e) => setIncludeDetails(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="include-details" className="text-sm font-medium text-gray-700">
                    Include detailed information
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Include additional columns with detailed information (may increase file size)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Export</h2>

            <div className="space-y-4">
              <button
                onClick={handleExport}
                disabled={!selectedReport || exporting}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {exporting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    📄 Export CSV
                  </>
                )}
              </button>

              {selectedReport && (
                <div className="text-sm text-gray-600 space-y-2 p-3 bg-gray-50 rounded-lg">
                  <p><strong>Selected:</strong> {reportInfo?.report_types.find(r => r.id === selectedReport)?.name}</p>
                  {startDate && <p><strong>From:</strong> {new Date(startDate).toLocaleDateString()}</p>}
                  {endDate && <p><strong>To:</strong> {new Date(endDate).toLocaleDateString()}</p>}
                  {selectedMaterial && <p><strong>Material:</strong> {selectedMaterial}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Export</h3>
            <div className="space-y-2">
              <button
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                onClick={() => {
                  setSelectedReport('price_trends');
                  const lastWeek = new Date();
                  lastWeek.setDate(lastWeek.getDate() - 7);
                  setStartDate(lastWeek.toISOString().split('T')[0]);
                  setEndDate(new Date().toISOString().split('T')[0]);
                  setSelectedMaterial('');
                }}
              >
                <span className="mr-2">📊</span>
                Last Week Prices
              </button>
              <button
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                onClick={() => {
                  setSelectedReport('trading_volume');
                  const lastMonth = new Date();
                  lastMonth.setMonth(lastMonth.getMonth() - 1);
                  setStartDate(lastMonth.toISOString().split('T')[0]);
                  setEndDate(new Date().toISOString().split('T')[0]);
                  setSelectedMaterial('');
                }}
              >
                <span className="mr-2">💰</span>
                Monthly Volume
              </button>
              <button
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                onClick={() => {
                  setSelectedReport('seller_performance');
                  setStartDate('');
                  setEndDate('');
                  setSelectedMaterial('');
                }}
              >
                <span className="mr-2">👥</span>
                All Sellers
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Descriptions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <span className="mr-2">📊</span>
              Price Trends
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Weekly aggregated price data by material type including average, median, min/max prices, and trading volumes.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Columns:</strong> Material, Week Start, Avg/Median/Min/Max Price, Volume, Auction Count
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <span className="mr-2">💰</span>
              Trading Volume
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Detailed transaction data for completed orders including buyer information and listing details.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Columns:</strong> Order ID, Type, Material, Title, Quantity, Total, Location, Buyer, Date
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <span className="mr-2">👥</span>
              Seller Performance
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Seller reputation scores and performance metrics including fulfillment rates and dispute counts.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Columns:</strong> Seller, Company, Score, Orders, Fulfillment Rate, Disputes, Cancellations
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <span className="mr-2">⏰</span>
              Auction Summary
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Complete auction results including bidding activity, winning bids, and participant information.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Columns:</strong> Auction ID, Material, Title, Seller, Dates, Bids, Winner, Location
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
