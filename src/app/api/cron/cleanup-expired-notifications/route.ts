import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cleanup settings (default 90 days for read notifications, 365 days for unread)
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'notifications.cleanup_read_days',
        'notifications.cleanup_unread_days'
      ]);

    const settingsMap = settings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>) || {};

    const readCleanupDays = settingsMap['notifications.cleanup_read_days'] || 90;
    const unreadCleanupDays = settingsMap['notifications.cleanup_unread_days'] || 365;

    const readCutoffDate = new Date();
    readCutoffDate.setDate(readCutoffDate.getDate() - readCleanupDays);

    const unreadCutoffDate = new Date();
    unreadCutoffDate.setDate(unreadCutoffDate.getDate() - unreadCleanupDays);

    // Clean up old read notifications
    const { data: deletedRead, error: readError } = await supabase
      .from('notifications')
      .delete()
      .not('read_at', 'is', null)
      .lt('created_at', readCutoffDate.toISOString())
      .select('id');

    if (readError) {
      console.error('Error deleting read notifications:', readError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Clean up very old unread notifications
    const { data: deletedUnread, error: unreadError } = await supabase
      .from('notifications')
      .delete()
      .is('read_at', null)
      .lt('created_at', unreadCutoffDate.toISOString())
      .select('id');

    if (unreadError) {
      console.error('Error deleting unread notifications:', unreadError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Clean up expired audit logs (7 years retention)
    const auditCutoffDate = new Date();
    auditCutoffDate.setFullYear(auditCutoffDate.getFullYear() - 7);

    const { data: deletedAudit, error: auditError } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', auditCutoffDate.toISOString())
      .select('id');

    if (auditError) {
      console.error('Error deleting audit logs:', auditError);
      // Don't fail the entire job for audit log cleanup errors
    }

    // Clean up old search logs (30 days retention)
    const searchCutoffDate = new Date();
    searchCutoffDate.setDate(searchCutoffDate.getDate() - 30);

    const { data: deletedSearch, error: searchError } = await supabase
      .from('search_logs')
      .delete()
      .lt('created_at', searchCutoffDate.toISOString())
      .select('id');

    if (searchError) {
      console.error('Error deleting search logs:', searchError);
      // Don't fail the entire job for search log cleanup errors
    }

    return NextResponse.json({
      success: true,
      cleanup_summary: {
        read_notifications_deleted: deletedRead?.length || 0,
        unread_notifications_deleted: deletedUnread?.length || 0,
        audit_logs_deleted: deletedAudit?.length || 0,
        search_logs_deleted: deletedSearch?.length || 0
      },
      retention_policies: {
        read_notifications_days: readCleanupDays,
        unread_notifications_days: unreadCleanupDays,
        audit_logs_years: 7,
        search_logs_days: 30
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
