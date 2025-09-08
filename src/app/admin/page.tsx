import { Suspense } from 'react';
import DashboardKPITiles from '@/components/DashboardKPITiles';
import { StatsGridSkeleton } from '@/components/LoadingSkeletons';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-700">
          Overview of platform activity and key metrics
        </p>
      </div>

      {/* KPI Tiles */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Key Metrics</h2>
        <Suspense fallback={<StatsGridSkeleton />}>
          <DashboardKPITiles />
        </Suspense>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400">
            <div>
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Pending KYC</p>
              <p className="text-sm text-gray-500">Review user verifications</p>
            </div>
          </div>
          <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400">
            <div>
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Active Auctions</p>
              <p className="text-sm text-gray-500">Monitor ongoing auctions</p>
            </div>
          </div>
          <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400">
            <div>
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Payment Issues</p>
              <p className="text-sm text-gray-500">Handle payment disputes</p>
            </div>
          </div>
          <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400">
            <div>
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">System Settings</p>
              <p className="text-sm text-gray-500">Configure platform settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No recent activity to display</p>
              <p className="text-xs text-gray-400 mt-1">Activity will appear here as users interact with the platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
