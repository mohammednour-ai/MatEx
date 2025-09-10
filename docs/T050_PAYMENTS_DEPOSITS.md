# T050: Payments & Deposits

## Overview
Create an admin payments and deposits dashboard that shows authorized/captured/refunded deposits, order status tracking, and provides manual refund capabilities with confirmation and audit trail logging.

## Implementation Details

### Payments & Deposits Dashboard Page
Create the main admin payments management interface.

```typescript
// src/app/admin/payments/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCardIcon,
  BanknotesIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface PaymentRecord {
  id: string;
  type: 'deposit' | 'payment' | 'refund' | 'payout';
  status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed' | 'cancelled';
  amount_cad: number;
  stripe_payment_intent?: string;
  stripe_charge_id?: string;
  user_id: string;
  listing_id?: string;
  order_id?: string;
  created_at: string;
  updated_at: string;
  user: {
    full_name: string;
    email: string;
  };
  listing?: {
    title: string;
  };
  order?: {
    id: string;
    status: string;
    total_cad: number;
  };
}

interface PaymentStats {
  total_deposits: number;
  authorized_deposits: number;
  captured_deposits: number;
  refunded_deposits: number;
  total_payments: number;
  pending_payouts: number;
  total_volume: number;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [processing, setProcessing] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    loadPayments();
    loadStats();
  }, [selectedType, selectedStatus]);

  const loadPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.append('type', selectedType);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`/api/admin/payments?${params}`);
      const data = await response.json();
      
      if (data.payments) {
        setPayments(data.payments);
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/payments/stats');
      const data = await response.json();
      
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load payment stats:', error);
    }
  };

  const processRefund = async (paymentId: string, reason: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
      }

      // Refresh data
      await loadPayments();
      await loadStats();
      closePaymentModal();
      alert('Refund processed successfully');
    } catch (error) {
      console.error('Failed to process refund:', error);
      alert('Failed to process refund. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentModal = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setRefundReason('');
  };

  const closePaymentModal = () => {
    setSelectedPayment(null);
    setRefundReason('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'authorized':
        return 'bg-blue-100 text-blue-800';
      case 'captured':
        return 'bg-green-100 text-green-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'bg-purple-100 text-purple-800';
      case 'payment':
        return 'bg-green-100 text-green-800';
      case 'refund':
        return 'bg-orange-100 text-orange-800';
      case 'payout':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'deposit', label: 'Deposits' },
    { value: 'payment', label: 'Payments' },
    { value: 'refund', label: 'Refunds' },
    { value: 'payout', label: 'Payouts' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'authorized', label: 'Authorized' },
    { value: 'captured', label: 'Captured' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payments & Deposits</h1>
        <p className="text-gray-600">Manage platform payments, deposits, and refunds</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Deposits</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total_deposits}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Payments</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total_payments}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowPathIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Refunded</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.refunded_deposits}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Volume</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${stats.total_volume.toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {typeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setLoading(true);
                  loadPayments();
                }}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No payments match your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.stripe_payment_intent || payment.id}
                          </div>
                          {payment.listing && (
                            <div className="text-sm text-gray-500">
                              {payment.listing.title}
                            </div>
                          )}
                          {payment.order && (
                            <div className="text-sm text-gray-500">
                              Order #{payment.order.id}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.user.full_name}</div>
                        <div className="text-sm text-gray-500">{payment.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(payment.type)}`}>
                          {payment.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${payment.amount_cad.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openPaymentModal(payment)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closePaymentModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Payment Details - {selectedPayment.stripe_payment_intent || selectedPayment.id}
                  </h3>
                  <button
                    onClick={closePaymentModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Payment Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                        <p className="mt-1 text-sm text-gray-900 font-mono">
                          {selectedPayment.stripe_payment_intent || selectedPayment.id}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Type</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(selectedPayment.type)}`}>
                            {selectedPayment.type}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedPayment.status)}`}>
                            {selectedPayment.status}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Amount</label>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          ${selectedPayment.amount_cad.toFixed(2)} CAD
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Created</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {new Date(selectedPayment.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Updated</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {new Date(selectedPayment.updated_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {selectedPayment.stripe_charge_id && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Stripe Charge ID</label>
                          <p className="mt-1 text-sm text-gray-900 font-mono">
                            {selectedPayment.stripe_charge_id}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User & Related Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">User & Related Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">User</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedPayment.user.full_name}</p>
                        <p className="text-sm text-gray-500">{selectedPayment.user.email}</p>
                      </div>
                      {selectedPayment.listing && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Related Listing</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedPayment.listing.title}</p>
                        </div>
                      )}
                      {selectedPayment.order && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Related Order</label>
                          <p className="mt-1 text-sm text-gray-900">
                            Order #{selectedPayment.order.id}
                          </p>
                          <p className="text-sm text-gray-500">
                            Status: {selectedPayment.order.status} | Total: ${selectedPayment.order.total_cad.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Refund Section */}
                {(selectedPayment.status === 'authorized' || selectedPayment.status === 'captured') && (
                  <div className="mt-6 border-t pt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Manual Refund</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Refund Reason
                        </label>
                        <textarea
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          rows={3}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Enter reason for refund..."
                        />
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <div className="flex">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Refund Confirmation
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>
                                This will process a refund of ${selectedPayment.amount_cad.toFixed(2)} CAD 
                                through Stripe. This action cannot be undone.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {(selectedPayment.status === 'authorized' || selectedPayment.status === 'captured') && (
                  <button
                    onClick={() => {
                      if (!refundReason.trim()) {
                        alert('Please provide a reason for the refund');
                        return;
                      }
                      if (confirm(`Are you sure you want to refund $${selectedPayment.amount_cad.toFixed(2)}?`)) {
                        processRefund(selectedPayment.id, refundReason);
                      }
                    }}
                    disabled={processing}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    {processing ? 'Processing...' : 'Process Refund'}
                  </button>
                )}
                <button
                  onClick={closePaymentModal}
                  disabled={processing}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Payments Management API
Create API endpoints for payments management operations.

```typescript
// src/app/api/admin/payments/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const supabase = createClient();

    let query = supabase
      .from('payment_records')
      .select(`
        id,
        type,
        status,
        amount_cad,
        stripe_payment_intent,
        stripe_charge_id,
        user_id,
        listing_id,
        order_id,
        created_at,
        updated_at,
        user:profiles!user_id(
          full_name,
          email
        ),
        listing:listings!listing_id(
          title
        ),
        order:orders!order_id(
          id,
          status,
          total_cad
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: payments, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Failed to get payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Payment Statistics API
Create API endpoint for payment statistics.

```typescript
// src/app/api/admin/payments/stats/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin();

    const supabase = createClient();

    // Get payment statistics
    const [
      { count: totalDeposits },
      { count: authorizedDeposits },
      { count: capturedDeposits },
      { count: refundedDeposits },
      { count: totalPayments },
      { count: pendingPayouts }
    ] = await Promise.all([
      supabase.from('payment_records').select('*', { count: 'exact', head: true }).eq('type', 'deposit'),
      supabase.from('payment_records').select('*', { count: 'exact', head: true }).eq('type', 'deposit').eq('status', 'authorized'),
      supabase.from('payment_records').select('*', { count: 'exact', head: true }).eq('type', 'deposit').eq('status', 'captured'),
      supabase.from('payment_records').select('*', { count: 'exact', head: true }).eq('type', 'deposit').eq('status', 'refunded'),
      supabase.from('payment_records').select('*', { count: 'exact', head: true }).eq('type', 'payment'),
      supabase.from('payment_records').select('*', { count: 'exact', head: true }).eq('type', 'payout').eq('status', 'pending')
    ]);

    // Get total volume
    const { data: volumeData } = await supabase
      .from('payment_records')
      .select('amount_cad')
      .in('status', ['captured', 'authorized']);

    const totalVolume = volumeData?.reduce((sum, record) => sum + record.amount_cad, 0) || 0;

    const stats = {
      total_deposits: totalDeposits || 0,
      authorized_deposits: authorizedDeposits || 0,
      captured_deposits: capturedDeposits || 0,
      refunded_deposits: refundedDeposits || 0,
      total_payments: totalPayments || 0,
      pending_payouts: pendingPayouts || 0,
      total_volume: totalVolume
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to get payment stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Manual Refund API
Create API endpoint for processing manual refunds.

```typescript
// src/app/api/admin/payments/[paymentId]/refund/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';
import { stripe } from '@/lib/stripe';
import { createNotification } from '@/lib/notification-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    // Verify admin access
    const { user: admin } = await requireAdmin();

    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Refund reason is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payment_records')
      .select(`
        *,
        user:profiles!user_id(full_name, email),
        listing:listings!listing_id(title)
      `)
      .eq('id', params.paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (!['authorized', 'captured'].includes(payment.status)) {
      return NextResponse.json({ error: 'Payment cannot be refunded' }, { status: 400 });
    }

    if (!payment.stripe_payment_intent) {
      return NextResponse.json({ error: 'No Stripe payment intent found' }, { status: 400 });
    }

    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent,
      reason: 'requested_by_customer',
      metadata: {
        admin_id: admin.id,
        reason: reason,
        original_payment_id: payment.id
      }
    });

    // Update payment record
    const { error: updateError } = await supabase
      .from('payment_records')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.paymentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create refund record
    await supabase
      .from('payment_records')
      .insert({
        type: 'refund',
        status: 'captured',
        amount_cad: payment.amount_cad,
        stripe_payment_intent: refund.id,
        user_id: payment.user_id,
        listing_id: payment.listing_id,
        order_id: payment.order_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Log the refund in audit log
    await supabase
      .from('audit_log')
      .insert({
        actor_id: admin.id,
        action: 'manual_refund',
        before: { status: payment.status },
        after: { 
          status: 'refunded', 
          refund_id: refund.id,
          reason,
          amount: payment.amount_cad
        }
      });

    // Notify user of refund
    await createNotification({
      userId: payment.user_id,
      type: 'info',
      title: 'Refund Processed',
      message: `A refund of $${payment.amount_cad.toFixed(2)} has been processed for ${payment.listing?.title || 'your transaction'}.`,
      link: '/dashboard'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Refund processed successfully',
      refund_id: refund.id
    });
  } catch (error) {
    console.error('Failed to process refund:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Payment Records Table Schema
Create a table to track all payment transactions.

```sql
-- supabase/migrations/024_payment_records.sql
CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'payment', 'refund', 'payout')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'authorized', 'captured', 'refunded', 'failed', 'cancelled')),
  amount_cad DECIMAL(10,2) NOT NULL,
  stripe_payment_intent TEXT,
  stripe_charge_id TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payment records
CREATE POLICY "Users can view own payment records" ON payment_records
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all payment records
CREATE POLICY "Admins can view all payment records" ON payment_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX idx_payment_records_type ON payment_records(type);
CREATE INDEX idx_payment_records_status ON payment_records(status);
CREATE INDEX idx_payment_records_stripe_payment_intent ON payment_records(stripe_payment_intent);
CREATE INDEX idx_payment_records_created_at ON payment_records(created_at);
```

## Files Created/Modified

### New Files
- `src/app/admin/payments/page.tsx` - Admin payments and deposits dashboard
- `src/app/api/admin/payments/route.ts` - Payments management API
- `src/app/api/admin/payments/stats/route.ts` - Payment statistics API
- `src/app/api/admin/payments/[paymentId]/refund/route.ts` - Manual refund processing API
- `supabase/migrations/024_payment_records.sql` - Payment records table schema

### Modified Files
- Admin navigation includes payments management link

## Database Requirements
- New `payment_records` table for tracking all transactions
- Existing `orders` table from T009
- Existing `listings` table from T007
- Existing `profiles` table from T006
- Existing `audit_log` table from T018

## Success Metrics
- [ ] Admin can view payment statistics dashboard
- [ ] Admin can filter payments by type and status
- [ ] Admin can view detailed payment information
- [ ] Admin can process manual refunds with confirmation
- [ ] All refund actions are logged in audit trail
- [ ] Users receive notifications when refunds are processed
- [ ] Payment records integrate with Stripe transactions
- [ ] Statistics accurately reflect platform financial activity
- [ ] Mobile-responsive payments management interface

## Testing Checklist
- [ ] Payment statistics load correctly
- [ ] Payment filtering works by type and status
- [ ] Payment detail modal displays all information
- [ ] Manual refund process works with Stripe integration
- [ ] Refund confirmations and reasons are required
- [ ] Audit log entries are created for all refund actions
- [ ] User notifications are sent for processed refunds
- [ ] Non-admin users cannot access payments management API
- [ ] Payment records table properly tracks all transaction types
- [ ] Mobile interface is usable and responsive
