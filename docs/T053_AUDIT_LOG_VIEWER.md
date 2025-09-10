# T053: Audit Log Viewer

## Overview
Implement a comprehensive audit log viewer for administrators to track and monitor all system activities, user actions, and data changes with advanced filtering, search, and export capabilities.

## Requirements
- View all audit log entries with detailed information
- Advanced filtering by actor, action, date range, and resource type
- Search functionality across log entries
- Export audit logs to CSV format
- Real-time log updates
- Detailed drill-down views for individual entries
- Performance optimization for large datasets

## Database Schema

### audit_logs Table (extends T018)
```sql
-- Ensure the audit_logs table has all necessary fields
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  actor_email TEXT, -- Store email for deleted users
  action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'login', 'bid_placed'
  resource_type TEXT, -- e.g., 'listing', 'bid', 'user', 'settings'
  resource_id TEXT, -- ID of the affected resource
  before_data JSONB, -- State before the action
  after_data JSONB, -- State after the action
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (IP, user agent, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_action CHECK (action ~ '^[a-z_]+$')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON audit_logs(actor_id, action, created_at DESC);

-- Add GIN index for JSONB fields
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin ON audit_logs USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_audit_logs_before_data_gin ON audit_logs USING GIN(before_data);
CREATE INDEX IF NOT EXISTS idx_audit_logs_after_data_gin ON audit_logs USING GIN(after_data);
```

## API Routes

### GET /api/admin/audit
```typescript
// src/app/api/admin/audit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  
  // Verify admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  
  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  // Filters
  const actorId = searchParams.get('actor_id');
  const action = searchParams.get('action');
  const resourceType = searchParams.get('resource_type');
  const resourceId = searchParams.get('resource_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const search = searchParams.get('search');

  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      actor_profile:profiles!audit_logs_actor_id_fkey(id, full_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  // Apply filters
  if (actorId) {
    query = query.eq('actor_id', actorId);
  }

  if (action) {
    query = query.eq('action', action);
  }

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  if (resourceId) {
    query = query.eq('resource_id', resourceId);
  }

  if (dateFrom) {
    query = query.gte('created_at', new Date(dateFrom).toISOString());
  }

  if (dateTo) {
    query = query.lte('created_at', new Date(dateTo).toISOString());
  }

  if (search) {
    // Search across multiple fields
    query = query.or(`
      action.ilike.%${search}%,
      resource_type.ilike.%${search}%,
      resource_id.ilike.%${search}%,
      actor_email.ilike.%${search}%
    `);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: logs, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get summary statistics
  const { data: stats } = await supabase
    .from('audit_logs')
    .select('action, resource_type')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

  const actionCounts = {};
  const resourceCounts = {};
  
  stats?.forEach(stat => {
    actionCounts[stat.action] = (actionCounts[stat.action] || 0) + 1;
    resourceCounts[stat.resource_type] = (resourceCounts[stat.resource_type] || 0) + 1;
  });

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    },
    stats: {
      last24Hours: stats?.length || 0,
      actionCounts,
      resourceCounts
    }
  });
}
```

### GET /api/admin/audit/[id]
```typescript
// src/app/api/admin/audit/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  
  // Verify admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: log, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      actor_profile:profiles!audit_logs_actor_id_fkey(id, full_name, email, role)
    `)
    .eq('id', params.id)
    .single();

  if (error || !log) {
    return NextResponse.json({ error: 'Audit log not found' }, { status: 404 });
  }

  // Get related logs (same resource or actor within time window)
  const timeWindow = new Date(log.created_at);
  timeWindow.setMinutes(timeWindow.getMinutes() - 30); // 30 minutes before
  const timeWindowEnd = new Date(log.created_at);
  timeWindowEnd.setMinutes(timeWindowEnd.getMinutes() + 30); // 30 minutes after

  const { data: relatedLogs } = await supabase
    .from('audit_logs')
    .select(`
      id, action, resource_type, resource_id, created_at,
      actor_profile:profiles!audit_logs_actor_id_fkey(full_name)
    `)
    .or(`resource_id.eq.${log.resource_id},actor_id.eq.${log.actor_id}`)
    .gte('created_at', timeWindow.toISOString())
    .lte('created_at', timeWindowEnd.toISOString())
    .neq('id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    log,
    relatedLogs: relatedLogs || []
  });
}
```

### GET /api/admin/audit/export
```typescript
// src/app/api/admin/audit/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  
  // Verify admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const actorId = searchParams.get('actor_id');
  const action = searchParams.get('action');
  const resourceType = searchParams.get('resource_type');

  let query = supabase
    .from('audit_logs')
    .select(`
      id, created_at, action, resource_type, resource_id,
      actor_id, actor_email,
      actor_profile:profiles!audit_logs_actor_id_fkey(full_name, email),
      metadata
    `)
    .order('created_at', { ascending: false })
    .limit(10000); // Limit exports to prevent memory issues

  // Apply same filters as main query
  if (actorId) query = query.eq('actor_id', actorId);
  if (action) query = query.eq('action', action);
  if (resourceType) query = query.eq('resource_type', resourceType);
  if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
  if (dateTo) query = query.lte('created_at', new Date(dateTo).toISOString());

  const { data: logs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (format === 'csv') {
    const csvHeaders = [
      'ID',
      'Timestamp',
      'Actor',
      'Actor Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent'
    ];

    const csvRows = logs?.map(log => [
      log.id,
      new Date(log.created_at).toISOString(),
      log.actor_profile?.full_name || 'System',
      log.actor_profile?.email || log.actor_email || '',
      log.action,
      log.resource_type || '',
      log.resource_id || '',
      log.metadata?.ip_address || '',
      log.metadata?.user_agent || ''
    ]) || [];

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
}
```

### GET /api/admin/audit/stats
```typescript
// src/app/api/admin/audit/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  
  // Verify admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get activity over time
  const { data: activityData } = await supabase
    .from('audit_logs')
    .select('created_at, action')
    .gte('created_at', startDate.toISOString())
    .order('created_at');

  // Get top actors
  const { data: topActors } = await supabase
    .from('audit_logs')
    .select(`
      actor_id,
      actor_profile:profiles!audit_logs_actor_id_fkey(full_name, email)
    `)
    .gte('created_at', startDate.toISOString());

  // Get action distribution
  const { data: actionStats } = await supabase
    .from('audit_logs')
    .select('action')
    .gte('created_at', startDate.toISOString());

  // Process data
  const activityByDay = {};
  const actionCounts = {};
  const actorCounts = {};

  activityData?.forEach(log => {
    const day = new Date(log.created_at).toISOString().split('T')[0];
    activityByDay[day] = (activityByDay[day] || 0) + 1;
  });

  actionStats?.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });

  topActors?.forEach(log => {
    if (log.actor_id) {
      const key = log.actor_profile?.full_name || 'Unknown User';
      actorCounts[key] = (actorCounts[key] || 0) + 1;
    }
  });

  // Sort top actors
  const sortedActors = Object.entries(actorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    activityByDay,
    actionCounts,
    topActors: sortedActors,
    totalLogs: activityData?.length || 0,
    dateRange: {
      from: startDate.toISOString(),
      to: new Date().toISOString()
    }
  });
}
```

## React Components

### AuditLogViewer Component
```typescript
// src/components/admin/AuditLogViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Eye, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import AuditLogDetail from './AuditLogDetail';

interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  actor_id?: string;
  actor_email?: string;
  actor_profile?: {
    full_name: string;
    email: string;
  };
  metadata?: Record<string, any>;
}

interface AuditStats {
  last24Hours: number;
  actionCounts: Record<string, number>;
  resourceCounts: Record<string, number>;
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    resource_type: '',
    actor_id: '',
    date_from: '',
    date_to: ''
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        )
      });

      const response = await fetch(`/api/admin/audit?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }));
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    setDateRange(range);
    setFilters(prev => ({
      ...prev,
      date_from: range.from ? range.from.toISOString() : '',
      date_to: range.to ? range.to.toISOString() : ''
    }));
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        )
      });

      const response = await fetch(`/api/admin/audit/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      case 'login': return 'outline';
      default: return 'secondary';
    }
  };

  if (selectedLog) {
    return (
      <AuditLogDetail
        logId={selectedLog}
        onBack={() => setSelectedLog(null)}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          {stats && (
            <p className="text-sm text-gray-600">
              {stats.last24Hours} activities in the last 24 hours
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Activities (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.last24Hours}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(stats.actionCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([action, count]) => (
                    <div key={action} className="flex justify-between text-sm">
                      <span className="capitalize">{action}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resource Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(stats.resourceCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="capitalize">{type}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Input
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            
            <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="bid_placed">Bid Placed</SelectItem>
                <SelectItem value="payment_processed">Payment Processed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.resource_type} onValueChange={(value) => handleFilterChange('resource_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Resources</SelectItem>
                <SelectItem value="listing">Listing</SelectItem>
                <SelectItem value="bid">Bid</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd')} -{' '}
                        {format(dateRange.to, 'LLL dd')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    'Pick a date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  search: '',
                  action: '',
                  resource_type: '',
                  actor_id: '',
                  date_from: '',
                  date_to: ''
                });
                setDateRange({});
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading audit logs...</div>
          ) : (
            <>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(log.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                          {log.resource_type && (
                            <Badge variant="outline">
                              {log.resource_type}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-medium">
                          {log.actor_profile?.full_name || log.actor_email || 'System'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {log.resource_id && `Resource: ${log.resource_id}`}
                          {log.metadata?.ip_address && ` • IP: ${log.metadata.ip_address}`}
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {logs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No audit logs found matching your criteria.
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### AuditLogDetail Component
```typescript
// src/components/admin/AuditLogDetail.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Clock, User, Database, Globe } from 'lucide-react';

interface AuditLogDetail {
  id: string;
  created_at: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  actor_id?: string;
  actor_email?: string;
  actor_profile?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface RelatedLog {
  id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  created_at: string;
  actor_profile?: {
    full_name: string;
  };
}

interface AuditLogDetailProps {
  logId: string;
  onBack: () => void;
}

export default function AuditLogDetail({ logId, onBack }: AuditLogDetailProps) {
  const [log, setLog] = useState<AuditLogDetail | null>(null);
  const [relatedLogs, setRelatedLogs] = useState<RelatedLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogDetail();
  }, [logId]);

  const fetchLogDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/audit/${logId}`);
      if (response.ok) {
        const data = await response.json();
        setLog(data.log);
        setRelatedLogs(data.relatedLogs);
      }
    } catch (error) {
      console.error('Failed to fetch log detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatJsonData = (data: any) => {
    if (!data) return 'No data';
    return JSON.stringify(data, null, 2);
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      case 'login': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading audit log details...</div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Logs
        </Button>
        <div className="text-center py-8 text-red-600">
          Audit log not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Button variant="outline" onClick={onBack} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Logs
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant={getActionBadgeVariant(log.action)}>
                  {log.action}
                </Badge>
                Audit Log Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Log ID</label>
                  <p className="font-mono text-sm">{log.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Timestamp</label>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Action</label>
                  <p className="capitalize font-medium">{log.action}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Resource Type</label>
                  <p className="capitalize">{log.resource_type || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Resource ID</label>
                  <p className="font-mono text-sm">{log.resource_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Actor</label>
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {log.actor_profile?.full_name || log.actor_email || 'System'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Changes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Data Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="after">
                <TabsList>
                  <TabsTrigger value="before">Before</TabsTrigger>
                  <TabsTrigger value="after">After</TabsTrigger>
                  <TabsTrigger value="diff">Diff</TabsTrigger>
                </TabsList>
                <TabsContent value="before" className="mt-4">
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                    {formatJsonData(log.before_data)}
                  </pre>
                </TabsContent>
                <TabsContent value="after" className="mt-4">
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                    {formatJsonData(log.after_data)}
                  </pre>
                </TabsContent>
                <TabsContent value="diff" className="mt-4">
                  <div className="space-y-2">
                    {log.before_data && log.after_data ? (
                      <DataDiff before={log.before_data} after={log.after_data} />
                    ) : (
                      <p className="text-gray-500">No comparison data available</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(log.metadata).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-sm font-medium text-gray-600 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <p className="text-sm break-all">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actor Details */}
          {log.actor_profile && (
            <Card>
              <CardHeader>
                <CardTitle>Actor Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p>{log.actor_profile.full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-sm">{log.actor_profile.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Role</label>
                  <Badge variant="outline" className="capitalize">
                    {log.actor_profile.role}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">User ID</label>
                  <p className="font-mono text-xs">{log.actor_profile.id}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Logs */}
          {relatedLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedLogs.map((relatedLog) => (
                    <div key={relatedLog.id} className="border-l-2 border-gray-200 pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getActionBadgeVariant(relatedLog.action)} className="text-xs">
                          {relatedLog.action}
                        </Badge>
                        {relatedLog.resource_type && (
                          <Badge variant="outline" className="text-xs">
                            {relatedLog.resource_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {relatedLog.actor_profile?.full_name || 'System'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(relatedLog.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for showing data differences
function DataDiff({ before, after }: { before: any; after: any }) {
  const changes = [];
  
  // Simple diff implementation
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  
  for (const key of allKeys) {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    
    if (beforeValue !== afterValue) {
      changes.push({
        key,
        before: beforeValue,
        after: afterValue,
        type: beforeValue === undefined ? 'added' : afterValue === undefined ? 'removed' : 'changed'
      });
    }
  }

  if (changes.length === 0) {
    return <p className="text-gray-500">No changes detected</p>;
  }

  return (
    <div className="space-y-2">
      {changes.map(({ key, before, after, type }) => (
        <div key={key} className="border rounded p-3">
          <div className="font-medium text-sm mb-2">{key}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-600 mb-1">Before:</div>
              <div className={`p-2 rounded ${type === 'added' ? 'bg-gray-100' : 'bg-red-50'}`}>
                {type === 'added' ? '(not set)' : JSON.stringify(before)}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">After:</div>
              <div className={`p-2 rounded ${type === 'removed' ? 'bg-gray-100' : 'bg-green-50'}`}>
                {type === 'removed' ? '(removed)' : JSON.stringify(after)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Admin Page Integration

### Admin Audit Page
```typescript
// src/app/admin/audit/page.tsx
import { Metadata } from 'next';
import AuditLogViewer from '@/components/admin/AuditLogViewer';

export const metadata: Metadata = {
  title: 'Audit Logs - MatEx Admin',
  description: 'View and manage system audit logs'
};

export default function AdminAuditPage() {
  return <AuditLogViewer />;
}
```

## Audit Logging Helper

### Enhanced Audit Logger
```typescript
// src/lib/audit-logger.ts
import { createServerClient } from '@/lib/supabaseServer';

interface AuditLogData {
  actor_id?: string;
  actor_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  private supabase;

  constructor() {
    this.supabase = createServerClient();
  }

  async log(data: AuditLogData) {
    try {
      // Get request metadata if available
      const metadata = {
        ...data.metadata,
        timestamp: new Date().toISOString(),
        user_agent: data.metadata?.user_agent || 'Unknown',
        ip_address: data.metadata?.ip_address || 'Unknown'
      };

      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          actor_id: data.actor_id,
          actor_email: data.actor_email,
          action: data.action,
          resource_type: data.resource_type,
          resource_id: data.resource_id,
          before_data: data.before_data,
          after_data: data.after_data,
          metadata
        });

      if (error) {
        console.error('Failed to log audit entry:', error);
      }
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  // Convenience methods for common actions
  async logCreate(resource_type: string, resource_id: string, data: any, actor_id?: string, actor_email?: string) {
    await this.log({
      actor_id,
      actor_email,
      action: 'create',
      resource_type,
      resource_id,
      after_data: data
    });
  }

  async logUpdate(resource_type: string, resource_id: string, before: any, after: any, actor_id?: string, actor_email?: string) {
    await this.log({
      actor_id,
      actor_email,
      action: 'update',
      resource_type,
      resource_id,
      before_data: before,
      after_data: after
    });
  }

  async logDelete(resource_type: string, resource_id: string, data: any, actor_id?: string, actor_email?: string) {
    await this.log({
      actor_id,
      actor_email,
      action: 'delete',
      resource_type,
      resource_id,
      before_data: data
    });
  }

  async logLogin(user_id: string, user_email: string, metadata?: Record<string, any>) {
    await this.log({
      actor_id: user_id,
      actor_email: user_email,
      action: 'login',
      resource_type: 'user',
      resource_id: user_id,
      metadata
    });
  }

  async logCustomAction(action: string, resource_type: string, resource_id: string, data?: any, actor_id?: string, actor_email?: string) {
    await this.log({
      actor_id,
      actor_email,
      action,
      resource_type,
      resource_id,
      after_data: data
    });
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// Middleware helper to extract request metadata
export function getRequestMetadata(request: Request) {
  return {
    ip_address: request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    referer: request.headers.get('referer') || undefined,
    origin: request.headers.get('origin') || undefined
  };
}
```

## Integration Examples

### API Route with Audit Logging
```typescript
// Example: src/app/api/listings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { auditLogger, getRequestMetadata } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const metadata = getRequestMetadata(request);

  try {
    // Create listing
    const { data: listing, error } = await supabase
      .from('listings')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the creation
    await auditLogger.logCreate(
      'listing',
      listing.id,
      listing,
      user.id,
      user.email
    );

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('Failed to create listing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Middleware for Automatic Logging
```typescript
// src/middleware.ts - Add audit logging
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auditLogger, getRequestMetadata } from '@/lib/audit-logger';

export async function middleware(request: NextRequest) {
  // Log API requests to sensitive endpoints
  if (request.nextUrl.pathname.startsWith('/api/admin/')) {
    const metadata = getRequestMetadata(request);
    
    // Extract user info from request if available
    // This would need to be implemented based on your auth setup
    
    await auditLogger.log({
      action: 'api_request',
      resource_type: 'admin_endpoint',
      resource_id: request.nextUrl.pathname,
      metadata: {
        ...metadata,
        method: request.method,
        url: request.url
      }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*']
};
```

## Performance Considerations

### Database Optimization
```sql
-- Partition audit logs by date for better performance
CREATE TABLE audit_logs_2024 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Create additional indexes for common queries
CREATE INDEX CONCURRENTLY idx_audit_logs_actor_action_date 
ON audit_logs(actor_id, action, created_at DESC);

CREATE INDEX CONCURRENTLY idx_audit_logs_resource_date 
ON audit_logs(resource_type, resource_id, created_at DESC);

-- Archive old logs (example: older than 2 years)
CREATE TABLE audit_logs_archive AS 
SELECT * FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '2 years';
```

### Caching Strategy
```typescript
// src/lib/audit-cache.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class AuditCache {
  private static readonly CACHE_TTL = 300; // 5 minutes

  static async getStats(key: string) {
    try {
      const cached = await redis.get(`audit:stats:${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async setStats(key: string, data: any) {
    try {
      await redis.setex(`audit:stats:${key}`, this.CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async invalidateStats() {
    try {
      const keys = await redis.keys('audit:stats:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}
```

## Security Considerations

1. **Access Control**: Only admin users can view audit logs
2. **Data Sanitization**: Sensitive data should be masked or excluded
3. **Retention Policy**: Implement automatic archival of old logs
4. **Integrity**: Audit logs should be immutable once created
5. **Monitoring**: Alert on suspicious patterns or bulk deletions

## Testing

### Audit Log Tests
```typescript
// tests/audit-logger.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLogger } from '@/lib/audit-logger';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger();
  });

  it('should log create actions', async () => {
    const testData = { name: 'Test Item', value: 123 };
    
    await logger.logCreate('test_resource', 'test-id', testData, 'user-123', 'test@example.com');
    
    // Verify log was created
    // This would require a test database setup
  });

  it('should log update actions with before/after data', async () => {
    const before = { name: 'Old Name', value: 100 };
    const after = { name: 'New Name', value: 200 };
    
    await logger.logUpdate('test_resource', 'test-id', before, after, 'user-123', 'test@example.com');
    
    // Verify log was created with correct data
  });
});
```

This implementation provides a comprehensive audit log viewer with advanced filtering, search capabilities, detailed drill-down views, and export functionality, ensuring administrators can effectively monitor and track all system activities.
