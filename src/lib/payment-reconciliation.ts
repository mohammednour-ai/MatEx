import { createServerClient } from './supabaseServer';
import { stripe } from './stripe';
import type Stripe from 'stripe';

/**
 * Reconcile expired payment authorizations
 * Should be run as a scheduled job every 6 hours
 */
export async function reconcileExpiredAuthorizations() {
  const supabase = createServerClient();

  try {
    console.log('Starting payment authorization reconciliation...');

    // Get expired PaymentIntents (older than 7 days)
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

    const expiredIntents = await stripe.paymentIntents.list({
      status: 'requires_capture',
      created: { lt: sevenDaysAgo },
      limit: 100
    });

    console.log(`Found ${expiredIntents.data.length} expired payment intents`);

    for (const intent of expiredIntents.data) {
      try {
        // Cancel the expired PaymentIntent
        await stripe.paymentIntents.cancel(intent.id);

        // Update deposit status in database
        if (intent.metadata?.deposit_id) {
          const { error } = await supabase
            .from('auction_deposits')
            .update({
              status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_payment_intent_id', intent.id);

          if (error) {
            console.error(`Failed to update deposit ${intent.metadata.deposit_id}:`, error);
          } else {
            console.log(`Expired deposit ${intent.metadata.deposit_id} and cancelled PaymentIntent ${intent.id}`);
          }
        }

        // Log the reconciliation action
        await supabase.from('audit_logs').insert({
          table_name: 'auction_deposits',
          record_id: intent.metadata?.deposit_id || intent.id,
          action: 'UPDATE',
          old_values: { status: 'authorized' },
          new_values: { status: 'expired' },
          user_id: null, // System action
          metadata: {
            reason: 'payment_reconciliation',
            stripe_payment_intent_id: intent.id,
            expired_at: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error(`Failed to process expired PaymentIntent ${intent.id}:`, error);
      }
    }

    console.log('Payment authorization reconciliation completed');
    return { processed: expiredIntents.data.length };

  } catch (error) {
    console.error('Payment reconciliation failed:', error);
    throw error;
  }
}

/**
 * Sync webhook events to ensure no missed payments
 */
export async function syncStripeWebhookEvents() {
  const supabase = createServerClient();

  try {
    console.log('Starting webhook event synchronization...');

    // Get recent events from Stripe (last 24 hours)
    const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    const events = await stripe.events.list({
      created: { gte: oneDayAgo },
      types: [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'payment_intent.canceled'
      ],
      limit: 100
    });

    console.log(`Found ${events.data.length} recent webhook events`);

    for (const event of events.data) {
      try {
        // Check if we've already processed this event
        const { data: existingLog } = await supabase
          .from('audit_logs')
          .select('id')
          .eq('metadata->stripe_event_id', event.id)
          .single();

        if (existingLog) {
          continue; // Already processed
        }

        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Update order status based on event type
        let newStatus: string;
        switch (event.type) {
          case 'payment_intent.succeeded':
            newStatus = 'paid';
            break;
          case 'payment_intent.payment_failed':
            newStatus = 'failed';
            break;
          case 'payment_intent.canceled':
            newStatus = 'cancelled';
            break;
          default:
            continue;
        }

        // Update order status
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (orderError) {
          console.error(`Failed to update order for PaymentIntent ${paymentIntent.id}:`, orderError);
          continue;
        }

        // Log the sync action
        await supabase.from('audit_logs').insert({
          table_name: 'orders',
          record_id: paymentIntent.id,
          action: 'UPDATE',
          old_values: {},
          new_values: { status: newStatus },
          user_id: null, // System action
          metadata: {
            reason: 'webhook_sync',
            stripe_event_id: event.id,
            stripe_payment_intent_id: paymentIntent.id,
            synced_at: new Date().toISOString()
          }
        });

        console.log(`Synced ${event.type} for PaymentIntent ${paymentIntent.id}`);

      } catch (error) {
        console.error(`Failed to sync event ${event.id}:`, error);
      }
    }

    console.log('Webhook event synchronization completed');
    return { synced: events.data.length };

  } catch (error) {
    console.error('Webhook sync failed:', error);
    throw error;
  }
}

/**
 * Validate pending deposits and their PaymentIntent status
 */
export async function validatePendingDeposits() {
  const supabase = createServerClient();

  try {
    console.log('Starting pending deposits validation...');

    // Get all pending deposits
    const { data: pendingDeposits, error } = await supabase
      .from('auction_deposits')
      .select('*')
      .eq('status', 'pending')
      .not('stripe_payment_intent_id', 'is', null);

    if (error) {
      throw error;
    }

    console.log(`Found ${pendingDeposits?.length || 0} pending deposits to validate`);

    for (const deposit of pendingDeposits || []) {
      try {
        // Get PaymentIntent status from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(
          deposit.stripe_payment_intent_id
        );

        let newStatus: string | null = null;

        switch (paymentIntent.status) {
          case 'requires_capture':
            newStatus = 'authorized';
            break;
          case 'succeeded':
            newStatus = 'captured';
            break;
          case 'canceled':
            newStatus = 'cancelled';
            break;
          case 'payment_failed':
            newStatus = 'failed';
            break;
        }

        if (newStatus && newStatus !== deposit.status) {
          // Update deposit status
          const { error: updateError } = await supabase
            .from('auction_deposits')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', deposit.id);

          if (updateError) {
            console.error(`Failed to update deposit ${deposit.id}:`, updateError);
            continue;
          }

          // Log the validation update
          await supabase.from('audit_logs').insert({
            table_name: 'auction_deposits',
            record_id: deposit.id,
            action: 'UPDATE',
            old_values: { status: deposit.status },
            new_values: { status: newStatus },
            user_id: null, // System action
            metadata: {
              reason: 'deposit_validation',
              stripe_payment_intent_id: deposit.stripe_payment_intent_id,
              stripe_status: paymentIntent.status,
              validated_at: new Date().toISOString()
            }
          });

          console.log(`Updated deposit ${deposit.id} from ${deposit.status} to ${newStatus}`);
        }

      } catch (error) {
        console.error(`Failed to validate deposit ${deposit.id}:`, error);
      }
    }

    console.log('Pending deposits validation completed');
    return { validated: pendingDeposits?.length || 0 };

  } catch (error) {
    console.error('Deposit validation failed:', error);
    throw error;
  }
}

/**
 * Main reconciliation function that runs all reconciliation tasks
 * Should be called by a cron job every 6 hours
 */
export async function reconcilePayments() {
  console.log('Starting comprehensive payment reconciliation...');

  const results = {
    expiredAuthorizations: 0,
    syncedWebhooks: 0,
    validatedDeposits: 0,
    errors: [] as string[]
  };

  try {
    // Reconcile expired authorizations
    const expiredResult = await reconcileExpiredAuthorizations();
    results.expiredAuthorizations = expiredResult.processed;
  } catch (error) {
    results.errors.push(`Expired authorizations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Sync webhook events
    const syncResult = await syncStripeWebhookEvents();
    results.syncedWebhooks = syncResult.synced;
  } catch (error) {
    results.errors.push(`Webhook sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Validate pending deposits
    const validateResult = await validatePendingDeposits();
    results.validatedDeposits = validateResult.validated;
  } catch (error) {
    results.errors.push(`Deposit validation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('Payment reconciliation completed:', results);
  return results;
}

/**
 * Get reconciliation status and metrics
 */
export async function getReconciliationMetrics() {
  const supabase = createServerClient();

  try {
    // Get counts of different deposit statuses
    const { data: depositStats } = await supabase
      .from('auction_deposits')
      .select('status')
      .then(({ data }) => {
        const stats = data?.reduce((acc, deposit) => {
          acc[deposit.status] = (acc[deposit.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        return { data: stats };
      });

    // Get recent reconciliation logs
    const { data: recentLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .in('metadata->reason', ['payment_reconciliation', 'webhook_sync', 'deposit_validation'])
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      depositStats,
      recentLogs,
      lastReconciliation: recentLogs?.[0]?.created_at || null
    };

  } catch (error) {
    console.error('Failed to get reconciliation metrics:', error);
    throw error;
  }
}
