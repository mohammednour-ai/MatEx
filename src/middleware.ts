import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { 
  createMiddlewareSupabaseClient, 
  getUserContext, 
  getRouteRequirements,
  hasPermission 
} from './lib/auth'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return res
  }

  try {
    // Create Supabase client
    const supabase = createMiddlewareSupabaseClient(req)
    
    // Get route requirements
    const routeReqs = getRouteRequirements(pathname)
    
    // Get user context
    const userContext = await getUserContext(supabase)
    
    // Log API requests for audit
    if (pathname.startsWith('/api/')) {
      console.log(`API Request: ${req.method} ${pathname} - User: ${userContext?.email || 'anonymous'}`)
    }

    // Handle unauthenticated users
    if (!userContext) {
      if (routeReqs.requiresAuth) {
        const redirectUrl = new URL('/login', req.url)
        redirectUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(redirectUrl)
      }
      return res
    }

    // Check if profile setup is needed
    if (!userContext.id && pathname !== '/profile/setup') {
      return NextResponse.redirect(new URL('/profile/setup', req.url))
    }

    // Check account status
    if (userContext.status !== 'active' && pathname !== '/account/suspended') {
      return NextResponse.redirect(new URL('/account/suspended', req.url))
    }

    // Check admin access
    if (routeReqs.isAdmin && !hasPermission(userContext, 'admin')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // Check email verification
    if (routeReqs.requiresEmailVerification && !hasPermission(userContext, undefined, true)) {
      const redirectUrl = new URL('/verify-email', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check KYC requirements
    if (routeReqs.requiresKyc && !hasPermission(userContext, undefined, false, true)) {
      const redirectUrl = new URL('/kyc/verify', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Add user context to headers for API routes
    if (pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-user-id', userContext.id)
      requestHeaders.set('x-user-email', userContext.email)
      requestHeaders.set('x-user-role', userContext.role)
      requestHeaders.set('x-user-status', userContext.status)
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }

    // Redirect authenticated users away from auth pages
    const authPages = ['/login', '/signup']
    if (authPages.includes(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return res

  } catch (error) {
    console.error('Middleware error:', error)
    
    // On error, check if route is public
    const routeReqs = getRouteRequirements(pathname)
    
    if (!routeReqs.isPublic) {
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      redirectUrl.searchParams.set('error', 'auth_error')
      return NextResponse.redirect(redirectUrl)
    }
    
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
