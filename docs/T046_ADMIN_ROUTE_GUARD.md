# T046: Admin Route Guard

## Overview
Implement admin role-based access control for `/admin` routes, ensuring only users with `profiles.role='admin'` can access admin functionality. Create a protected admin layout with sidebar navigation.

## Implementation Details

### Admin Route Middleware
Create middleware to protect admin routes and verify admin role.

```typescript
// src/middleware.ts (updated)
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Check if accessing admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      // Redirect to login if not authenticated
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      // Redirect to unauthorized page or dashboard
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Admin Layout Component
Create a reusable admin layout with sidebar navigation.

```typescript
// src/components/AdminLayout.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  CogIcon, 
  UsersIcon, 
  DocumentTextIcon,
  CreditCardIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Settings', href: '/admin/settings', icon: CogIcon },
  { name: 'KYC Management', href: '/admin/kyc', icon: ShieldCheckIcon },
  { name: 'Listings', href: '/admin/listings', icon: DocumentTextIcon },
  { name: 'Payments', href: '/admin/payments', icon: CreditCardIcon },
  { name: 'Templates', href: '/admin/templates', icon: BellIcon },
  { name: 'Legal Pages', href: '/admin/legal', icon: DocumentDuplicateIcon },
  { name: 'Audit Logs', href: '/admin/audit', icon: ChartBarIcon },
  { name: 'Reports', href: '/admin/reports', icon: ChartBarIcon },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <h1 className="text-xl font-semibold text-gray-900">MatEx Admin</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b">
            <h1 className="text-xl font-semibold text-gray-900">MatEx Admin</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-gray-600"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
```

### Admin Layout Route
Create the admin layout route that wraps all admin pages.

```typescript
// src/app/admin/layout.tsx
import AdminLayout from '@/components/AdminLayout';

export default function AdminLayoutRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
```

### Admin Dashboard Page
Create the main admin dashboard page.

```typescript
// src/app/admin/page.tsx
import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

async function getAdminStats() {
  const supabase = createClient();

  // Get various statistics for the admin dashboard
  const [
    { count: totalUsers },
    { count: totalListings },
    { count: activeAuctions },
    { count: pendingKyc },
    { count: totalOrders }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('auctions').select('*', { count: 'exact', head: true }).gt('end_at', new Date().toISOString()),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
    supabase.from('orders').select('*', { count: 'exact', head: true })
  ]);

  return {
    totalUsers: totalUsers || 0,
    totalListings: totalListings || 0,
    activeAuctions: activeAuctions || 0,
    pendingKyc: pendingKyc || 0,
    totalOrders: totalOrders || 0
  };
}

export default async function AdminDashboard() {
  const supabase = createClient();
  
  // Verify admin access (double-check)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard?error=unauthorized');
  }

  const stats = await getAdminStats();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of your MatEx platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">U</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">L</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Listings</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalListings}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">A</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Auctions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.activeAuctions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">K</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending KYC</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingKyc}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">O</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalOrders}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/admin/kyc"
              className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="mt-2 block text-sm font-medium text-gray-900">Review KYC Applications</span>
            </a>
            <a
              href="/admin/settings"
              className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="mt-2 block text-sm font-medium text-gray-900">Manage Settings</span>
            </a>
            <a
              href="/admin/reports"
              className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="mt-2 block text-sm font-medium text-gray-900">View Reports</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Admin Role Helper
Create a utility function to check admin role.

```typescript
// src/lib/admin-helpers.ts
import { createClient } from '@/lib/supabaseServer';

export async function isAdmin(userId?: string): Promise<boolean> {
  const supabase = createClient();
  
  let targetUserId = userId;
  
  if (!targetUserId) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return false;
    targetUserId = user.id;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single();

  return !error && profile?.role === 'admin';
}

export async function requireAdmin() {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return { user, profile };
}
```

### Unauthorized Page
Create a page to show when users try to access admin routes without permission.

```typescript
// src/app/dashboard/page.tsx (updated to handle unauthorized error)
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const [showUnauthorized, setShowUnauthorized] = useState(false);

  useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') {
      setShowUnauthorized(true);
    }
  }, [searchParams]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {showUnauthorized && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>You don't have permission to access the admin panel. Please contact support if you believe this is an error.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {/* Rest of dashboard content */}
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Welcome to your MatEx dashboard.</p>
      </div>
    </div>
  );
}
```

## Files Created/Modified

### New Files
- `src/components/AdminLayout.tsx` - Admin layout with sidebar navigation
- `src/app/admin/layout.tsx` - Admin layout route wrapper
- `src/app/admin/page.tsx` - Admin dashboard with statistics
- `src/lib/admin-helpers.ts` - Admin role verification utilities

### Modified Files
- `src/middleware.ts` - Add admin route protection
- `src/app/dashboard/page.tsx` - Handle unauthorized access error

## Dependencies
Add Heroicons for admin UI icons:

```json
{
  "dependencies": {
    "@heroicons/react": "^2.0.18"
  }
}
```

## Database Requirements
- Existing `profiles` table with `role` column from T006
- Admin users must have `role = 'admin'` in their profile

## Success Metrics
- [ ] Non-admin users cannot access `/admin` routes
- [ ] Unauthenticated users redirected to login
- [ ] Admin users can access all admin functionality
- [ ] Admin layout displays correctly with navigation
- [ ] Admin dashboard shows platform statistics
- [ ] Mobile-responsive admin interface
- [ ] Proper error handling for unauthorized access
- [ ] Admin role verification works server-side

## Testing Checklist
- [ ] Admin user can access `/admin` routes
- [ ] Non-admin user gets redirected from `/admin` routes
- [ ] Unauthenticated user gets redirected to login
- [ ] Admin sidebar navigation works correctly
- [ ] Mobile sidebar opens and closes properly
- [ ] Dashboard statistics display correctly
- [ ] Unauthorized error message shows on dashboard
- [ ] All admin navigation links are functional
