# T041: Payout Delay & Fees

## Overview
Implement payout delay system and platform fee calculations for sellers. This system applies configurable transaction fees, enforces payout delays for security, and provides transparent fee breakdowns in order summaries.

## Implementation Details

### Payout Helper Functions
```typescript
// src/lib/payout-helpers.ts
import { supabase } from './supabaseServer';
import { stripe } from './stripe';

export interface PayoutCalculation {
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  payout_delay_days: number;
  payout_available_at: string;
}

export async function calculateSellerPayout(orderId: string): Promise<PayoutCalculation | null> {
  try {
    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) return null;

    // Get fee settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['fees.transaction_percent', 'payout.delay_days'])
      .then(res => {
        const settingsMap = res.data?.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, any>) || {};
        return { data: settingsMap };
      });

    const feePercent = settings?.data?.['fees.transaction_percent'] || 0.04;
    const delayDays = settings?.data?.['payout.delay_days'] || 7;

    const grossAmount = order.subtotal_cad; // Seller's portion before fees
    const platformFee = Math.round(grossAmount * feePercent * 100) / 100;
    const netAmount = grossAmount - platformFee;

    // Calculate payout availability date
    const payoutDate = new Date();
    payoutDate.setDate(payoutDate.getDate() + delayDays);

    return {
      gross_amount: grossAmount,
      platform_fee: platformFee,
      net_amount: netAmount,
      payout_delay_days: delayDays,
      payout_available_at: payoutDate.toISOString()
    };
  } catch (error) {
    console.error('Error calculating payout:', error);
    return null;
  }
}

export async function processPendingPayouts() {
  try {
    const now = new Date().toISOString();
    
    // Find orders ready for payout
    const { data: readyOrders } = await supabase
      .from('orders')
      .select(`
        id,
        seller_id,
        subtotal_cad,
        payout_status,
        payout_available_at,
        listing:listings(title)
      `)
      .eq('status', 'paid')
      .eq('payout_status', 'pending')
      .lte('payout_available_at', now);

    if (!readyOrders?.length) return;

    console.log(`Processing ${readyOrders.length} pending payouts`);

    for (const order of readyOrders) {
      await processSellerPayout(order.id);
    }
  } catch (error) {
    console.error('Error processing pending payouts:', error);
  }
}

export async function processSellerPayout(orderId: string): Promise<boolean> {
  try {
    const payout = await calculateSellerPayout(orderId);
    if (!payout) return false;

    // Get order and seller details
    const { data: order } = await supabase
      .from('orders')
      .select(`
        id,
        seller_id,
        listing:listings(title),
        seller:profiles(full_name, email)
      `)
      .eq('id', orderId)
      .single();

    if (!order) return false;

    // In a real implementation, integrate with payment processor for actual payouts
    // For now, we'll mark as processed and notify the seller
    
    // Update order payout status
    await supabase
      .from('orders')
      .update({
        payout_status: 'processed',
        payout_processed_at: new Date().toISOString(),
        seller_payout_amount: payout.net_amount
      })
      .eq('id', orderId);

    // Notify seller
    await supabase
      .from('notifications')
      .insert({
        user_id: order.seller_id,
        type: 'success',
        title: 'Payout Processed',
        message: `Your payout of $${payout.net_amount.toLocaleString()} CAD for "${order.listing.title}" has been processed.`,
        link: `/orders/${order.id}`,
        created_at: new Date().toISOString()
      });

    console.log(`Processed payout for order ${orderId}: $${payout.net_amount} CAD`);
    return true;
  } catch (error) {
    console.error('Error processing seller payout:', error);
    return false;
  }
}
```

### Payout Status Component
```typescript
// src/components/PayoutStatus.tsx
import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';

interface PayoutInfo {
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  payout_delay_days: number;
  payout_available_at: string;
  payout_status: 'pending' | 'processed' | 'failed';
  payout_processed_at?: string;
}

interface PayoutStatusProps {
  orderId: string;
  isSeller: boolean;
}

export function PayoutStatus({ orderId, isSeller }: PayoutStatusProps) {
  const [payout, setPayout] = useState<PayoutInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSeller) {
      loadPayoutInfo();
    } else {
      setLoading(false);
    }
  }, [orderId, isSeller]);

  const loadPayoutInfo = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/payout`);
      if (response.ok) {
        const data = await response.json();
        setPayout(data.payout);
      }
    } catch (error) {
      console.error('Failed to load payout info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSeller) return null;

  if (loading) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!payout) return null;

  const isPayoutReady = new Date() >= new Date(payout.payout_available_at);
  const payoutDate = new Date(payout.payout_available_at);

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Seller Payout Information</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Gross Amount:</span>
          <span className="font-medium">${payout.gross_amount.toLocaleString()} CAD</span>
        </div>
        
        <div className="flex justify-between text-red-600">
          <span>Platform Fee ({((payout.platform_fee / payout.gross_amount) * 100).toFixed(1)}%):</span>
          <span className="font-medium">-${payout.platform_fee.toLocaleString()} CAD</span>
        </div>
        
        <div className="flex justify-between border-t pt-3 text-lg font-bold text-green-600">
          <span>Net Payout:</span>
          <span>${payout.net_amount.toLocaleString()} CAD</span>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {payout.payout_status === 'processed' ? (
              <svg className="h-5 w-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900">
              {payout.payout_status === 'processed' ? 'Payout Completed' : 'Payout Pending'}
            </h4>
            <div className="mt-1 text-sm text-blue-800">
              {payout.payout_status === 'processed' ? (
                <p>
                  Processed on {format(new Date(payout.payout_processed_at!), 'PPP')}
                </p>
              ) : (
                <div>
                  <p>
                    Available on {format(payoutDate, 'PPP')} 
                    ({payout.payout_delay_days} day security hold)
                  </p>
                  {isPayoutReady && (
                    <p className="text-green-700 font-medium mt-1">
                      ✓ Ready for processing
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          Platform fees help cover payment processing, platform maintenance, and customer support.
          Payouts are subject to a {payout.payout_delay_days}-day hold for security purposes.
        </p>
      </div>
    </div>
  );
}
```

### Payout API Endpoint
```typescript
// src/app/api/orders/[id]/payout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { calculateSellerPayout } from '@/lib/payout-helpers';
import { supabase } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;

    // Verify user is the seller for this order
    const { data: order } = await supabase
      .from('orders')
      .select('seller_id, payout_status, payout_processed_at')
      .eq('id', orderId)
      .single();

    if (!order || order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate payout information
    const payoutCalc = await calculateSellerPayout(orderId);
    if (!payoutCalc) {
      return NextResponse.json({ error: 'Unable to calculate payout' }, { status: 400 });
    }

    const payoutInfo = {
      ...payoutCalc,
      payout_status: order.payout_status || 'pending',
      payout_processed_at: order.payout_processed_at
    };

    return NextResponse.json({ payout: payoutInfo });
  } catch (error) {
    console.error('Error fetching payout info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Admin Payout Management
```typescript
// src/components/admin/PayoutManagement.tsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface PendingPayout {
  order_id: string;
  seller_name: string;
  listing_title: string;
  gross_amount: number;
  net_amount: number;
  payout_available_at: string;
}

export function PayoutManagement() {
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPendingPayouts();
  }, []);

  const loadPendingPayouts = async () => {
    try {
      const response = await fetch('/api/admin/payouts/pending');
      if (response.ok) {
        const data = await response.json();
        setPendingPayouts(data.payouts || []);
      }
    } catch (error) {
      console.error('Failed to load pending payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayout = async (orderId: string) => {
    setProcessing(orderId);
    try {
      const response = await fetch(`/api/admin/payouts/process/${orderId}`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadPendingPayouts();
      } else {
        alert('Failed to process payout');
      }
    } catch (error) {
      console.error('Failed to process payout:', error);
      alert('Failed to process payout');
    } finally {
      setProcessing(null);
    }
  };

  const processAllReady = async () => {
    try {
      const response = await fetch('/api/admin/payouts/process-all', {
        method: 'POST'
      });

      if (response.ok) {
        await loadPendingPayouts();
      }
    } catch (error) {
      console.error('Failed to process all payouts:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading pending payouts...</div>;
  }

  const readyPayouts = pendingPayouts.filter(
    p => new Date() >= new Date(p.payout_available_at)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Payout Management</h3>
        {readyPayouts.length > 0 && (
          <button
            onClick={processAllReady}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Process All Ready ({readyPayouts.length})
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Listing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Net Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Available Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pendingPayouts.map((payout) => {
              const isReady = new Date() >= new Date(payout.payout_available_at);
              return (
                <tr key={payout.order_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payout.seller_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payout.listing_title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${payout.net_amount.toLocaleString()} CAD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(payout.payout_available_at), 'PPP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isReady ? (
                      <button
                        onClick={() => processPayout(payout.order_id)}
                        disabled={processing === payout.order_id}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        {processing === payout.order_id ? 'Processing...' : 'Process'}
                      </button>
                    ) : (
                      <span className="text-gray-400">Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pendingPayouts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No pending payouts
        </div>
      )}
    </div>
  );
}
```

## Files Created/Modified
- `src/lib/payout-helpers.ts` - Payout calculation and processing logic
- `src/components/PayoutStatus.tsx` - Seller payout status display
- `src/app/api/orders/[id]/payout/route.ts` - Payout information API
- `src/components/admin/PayoutManagement.tsx` - Admin payout management interface

## Technical Considerations
- **Fee Calculation**: Configurable platform fee percentages
- **Security Delays**: Enforced payout delays for fraud prevention
- **Transparency**: Clear fee breakdowns for sellers
- **Automation**: Automated payout processing with admin oversight
- **Notifications**: Seller notifications for payout status changes
- **Audit Trail**: Complete tracking of payout processing

## Success Metrics
- Accurate fee calculations with zero discrepancies
- Timely payout processing after security hold periods
- Clear communication of fees and delays to sellers
- Automated processing reduces manual admin work
- Complete audit trail for all payout transactions
- Seller satisfaction with transparent fee structure

## Dependencies
- Existing order and payment systems
- App settings for configurable fees and delays
- Notification system for seller updates
- Admin authentication and management interface
