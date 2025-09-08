import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // TODO: Add proper authentication middleware for admin routes
    // For now, using server client with service role key

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const channel = searchParams.get('channel');
    const user_id = searchParams.get('user_id');
    const template_id = searchParams.get('template_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseServer
      .from('notifications')
      .select(`
        *,
        user:profiles!notifications_user_id_fkey(id, email, full_name),
        template:notification_templates!notifications_template_id_fkey(id, name, type)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (channel) {
      query = query.eq('channel', channel);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (template_id) {
      query = query.eq('template_id', template_id);
    }
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // Get total count for pagination
    const { count } = await supabaseServer
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    // Get paginated results
    const { data: notifications, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get summary statistics
    const { data: stats } = await supabaseServer
      .rpc('get_notifications_summary', {
        p_status: status,
        p_type: type,
        p_channel: channel,
        p_user_id: user_id,
        p_template_id: template_id,
        p_date_from: date_from,
        p_date_to: date_to
      });

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount: count || 0
      },
      summary: stats || {
        total_notifications: 0,
        sent_count: 0,
        pending_count: 0,
        failed_count: 0,
        read_count: 0,
        unread_count: 0
      }
    });

  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper authentication middleware for admin routes
    // For now, using server client with service role key

    const body = await request.json();
    const {
      type,
      user_id,
      user_ids,
      template_id,
      channels,
      subject,
      message,
      data,
      scheduled_for,
      priority
    } = body;

    // Validate required fields
    if (!type || (!user_id && !user_ids) || !message) {
      return NextResponse.json({
        error: 'Missing required fields: type, user_id/user_ids, message'
      }, { status: 400 });
    }

    // Determine target users
    let targetUsers = [];
    if (user_ids && Array.isArray(user_ids)) {
      targetUsers = user_ids;
    } else if (user_id) {
      targetUsers = [user_id];
    }

    // Validate users exist
    const { data: users, error: usersError } = await supabaseServer
      .from('profiles')
      .select('id, email, full_name, notification_preferences')
      .in('id', targetUsers);

    if (usersError || !users || users.length === 0) {
      return NextResponse.json({ error: 'No valid users found' }, { status: 400 });
    }

    // Get template if specified
    let template = null;
    if (template_id) {
      const { data: templateData, error: templateError } = await supabaseServer
        .from('notification_templates')
        .select('*')
        .eq('id', template_id)
        .eq('is_active', true)
        .single();

      if (templateError || !templateData) {
        return NextResponse.json({ error: 'Template not found or inactive' }, { status: 400 });
      }
      template = templateData;
    }

    // Determine channels to use
    const defaultChannels = ['inapp'];
    const targetChannels = channels || (template?.channels) || defaultChannels;

    const createdNotifications = [];
    const errors = [];

    // Create notifications for each user
    for (const user of users) {
      try {
        // Check user's notification preferences
        const userPrefs = user.notification_preferences || {};
        const allowedChannels = targetChannels.filter((channel: string) => {
          // Check if user has opted out of this channel for this type
          const channelPref = userPrefs[`${type}_${channel}`];
          return channelPref !== false; // Allow if not explicitly disabled
        });

        if (allowedChannels.length === 0) {
          errors.push({ user_id: user.id, error: 'User has disabled all channels for this notification type' });
          continue;
        }

        // Create notification for each allowed channel
        for (const channel of allowedChannels) {
          const notificationData = {
            type,
            user_id: user.id,
            template_id: template_id || null,
            channel,
            subject: subject || template?.subject || `${type} notification`,
            message: message || template?.content || '',
            data: data || {},
            status: scheduled_for ? 'scheduled' : 'pending',
            scheduled_for: scheduled_for || null,
            priority: priority || 'normal',
            created_by: 'admin' // TODO: Get actual admin user ID from auth
          };

          const { data: notification, error: notificationError } = await supabaseServer
            .from('notifications')
            .insert(notificationData)
            .select(`
              *,
              user:profiles!notifications_user_id_fkey(id, email, full_name),
              template:notification_templates!notifications_template_id_fkey(id, name, type)
            `)
            .single();

          if (notificationError) {
            errors.push({
              user_id: user.id,
              channel,
              error: notificationError.message
            });
          } else {
            createdNotifications.push(notification);

            // If not scheduled, trigger immediate sending for non-inapp channels
            if (!scheduled_for && channel !== 'inapp') {
              // Queue for background processing
              await supabaseServer
                .from('notification_queue')
                .insert({
                  notification_id: notification.id,
                  channel,
                  priority: priority || 'normal',
                  scheduled_for: new Date().toISOString()
                });
            }
          }
        }
      } catch (error) {
        errors.push({
          user_id: user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log audit trail
    await supabaseServer
      .from('audit_logs')
      .insert({
        user_id: 'admin', // TODO: Get actual admin user ID from auth
        action: 'create_notifications',
        resource_type: 'notification',
        resource_id: null,
        details: {
          type,
          target_users: targetUsers,
          channels: targetChannels,
          template_id,
          scheduled_for,
          created_count: createdNotifications.length,
          error_count: errors.length
        },
        severity: 'low'
      });

    return NextResponse.json({
      success: true,
      message: `Created ${createdNotifications.length} notifications`,
      data: {
        notifications: createdNotifications,
        errors: errors,
        summary: {
          total_users: users.length,
          notifications_created: createdNotifications.length,
          errors_count: errors.length
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in notifications POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Bulk operations endpoint
export async function PATCH(request: NextRequest) {
  try {
    // TODO: Add proper authentication middleware for admin routes
    // For now, using server client with service role key

    const body = await request.json();
    const { action, notification_ids, filters } = body;

    if (!action) {
      return NextResponse.json({
        error: 'Missing required field: action'
      }, { status: 400 });
    }

    const validActions = ['mark_read', 'mark_unread', 'delete', 'resend', 'cancel'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`
      }, { status: 400 });
    }

    let targetNotifications = [];

    // Get notifications by IDs or filters
    if (notification_ids && Array.isArray(notification_ids) && notification_ids.length > 0) {
      const { data: notifications, error } = await supabaseServer
        .from('notifications')
        .select('*')
        .in('id', notification_ids);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
      }
      targetNotifications = notifications || [];
    } else if (filters) {
      // Build query from filters
      let query = supabaseServer.from('notifications').select('*');

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.channel) query = query.eq('channel', filters.channel);
      if (filters.user_id) query = query.eq('user_id', filters.user_id);
      if (filters.date_from) query = query.gte('created_at', filters.date_from);
      if (filters.date_to) query = query.lte('created_at', filters.date_to);

      const { data: notifications, error } = await query;
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
      }
      targetNotifications = notifications || [];
    } else {
      return NextResponse.json({
        error: 'Must provide either notification_ids or filters'
      }, { status: 400 });
    }

    if (targetNotifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No notifications found to process',
        results: { processed: 0, errors: [] }
      });
    }

    const results = [];
    const errors = [];

    // Process each notification
    for (const notification of targetNotifications) {
      try {
        let updateData: any = {};

        switch (action) {
          case 'mark_read':
            if (notification.channel === 'inapp') {
              updateData = {
                read_at: new Date().toISOString(),
                status: 'read'
              };
            } else {
              errors.push({
                notification_id: notification.id,
                error: 'Can only mark in-app notifications as read'
              });
              continue;
            }
            break;

          case 'mark_unread':
            if (notification.channel === 'inapp') {
              updateData = {
                read_at: null,
                status: 'sent'
              };
            } else {
              errors.push({
                notification_id: notification.id,
                error: 'Can only mark in-app notifications as unread'
              });
              continue;
            }
            break;

          case 'delete':
            const { error: deleteError } = await supabaseServer
              .from('notifications')
              .delete()
              .eq('id', notification.id);

            if (deleteError) {
              errors.push({
                notification_id: notification.id,
                error: deleteError.message
              });
            } else {
              results.push({
                notification_id: notification.id,
                action: 'deleted'
              });
            }
            continue;

          case 'resend':
            if (notification.status === 'failed') {
              updateData = {
                status: 'pending',
                sent_at: null,
                error_message: null,
                retry_count: (notification.retry_count || 0) + 1
              };

              // Re-queue for sending
              await supabaseServer
                .from('notification_queue')
                .insert({
                  notification_id: notification.id,
                  channel: notification.channel,
                  priority: notification.priority || 'normal',
                  scheduled_for: new Date().toISOString()
                });
            } else {
              errors.push({
                notification_id: notification.id,
                error: 'Can only resend failed notifications'
              });
              continue;
            }
            break;

          case 'cancel':
            if (['pending', 'scheduled'].includes(notification.status)) {
              updateData = {
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
              };

              // Remove from queue
              await supabaseServer
                .from('notification_queue')
                .delete()
                .eq('notification_id', notification.id);
            } else {
              errors.push({
                notification_id: notification.id,
                error: 'Can only cancel pending or scheduled notifications'
              });
              continue;
            }
            break;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabaseServer
            .from('notifications')
            .update(updateData)
            .eq('id', notification.id);

          if (updateError) {
            errors.push({
              notification_id: notification.id,
              error: updateError.message
            });
          } else {
            results.push({
              notification_id: notification.id,
              action: action
            });
          }
        }
      } catch (error) {
        errors.push({
          notification_id: notification.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log audit trail
    await supabaseServer
      .from('audit_logs')
      .insert({
        user_id: 'admin', // TODO: Get actual admin user ID from auth
        action: `bulk_notification_${action}`,
        resource_type: 'notification',
        resource_id: null,
        details: {
          action,
          target_count: targetNotifications.length,
          successful_count: results.length,
          error_count: errors.length,
          filters: filters || null,
          notification_ids: notification_ids || null
        },
        severity: 'medium'
      });

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      results: {
        processed: results.length,
        errors: errors.length,
        total_target: targetNotifications.length,
        successful: results,
        failed: errors
      }
    });

  } catch (error) {
    console.error('Error in notifications PATCH API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
