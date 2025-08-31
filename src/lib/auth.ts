import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Types for user context
export interface UserContext {
  id: string
  email: string
  role: 'buyer' | 'seller' | 'both' | 'admin'
  status: 'pending' | 'active' | 'suspended'
  email_verified: boolean
  kyc_status: 'pending' | 'in_review' | 'approved' | 'rejected'
}

// Create Supabase client for middleware
export function createMiddlewareSupabaseClient(req: NextRequest) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce'
      }
    }
  )
}

// Create server component client
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Get user session and profile
export async function getUserContext(supabase: any): Promise<UserContext | null> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status, email_verified, kyc_status')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email || '',
      role: profile.role,
      status: profile.status,
      email_verified: profile.email_verified,
      kyc_status: profile.kyc_status
    }
  } catch (error) {
    console.error('Error getting user context:', error)
    return null
  }
}

// Check if user has required permissions
export function hasPermission(
  userContext: UserContext | null,
  requiredRole?: string,
  requireEmailVerified?: boolean,
  requireKycApproved?: boolean
): boolean {
  if (!userContext) return false

  // Check account status
  if (userContext.status !== 'active') return false

  // Check role
  if (requiredRole) {
    if (requiredRole === 'admin' && userContext.role !== 'admin') return false
    if (requiredRole === 'seller' && !['seller', 'both', 'admin'].includes(userContext.role)) return false
  }

  // Check email verification
  if (requireEmailVerified && !userContext.email_verified) return false

  // Check KYC status
  if (requireKycApproved && userContext.kyc_status !== 'approved') return false

  return true
}

// Route protection configuration
export const routeConfig = {
  public: [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/about',
    '/contact',
    '/terms',
    '/privacy'
  ],
  protected: [
    '/dashboard',
    '/profile',
    '/listings',
    '/auctions',
    '/orders',
    '/inspections'
  ],
  admin: [
    '/admin'
  ],
  emailVerificationRequired: [
    '/listings/create',
    '/auctions/create',
    '/orders',
    '/admin'
  ],
  kycRequired: [
    '/listings/create',
    '/auctions/create',
    '/orders/create'
  ]
}

// Check route requirements
export function getRouteRequirements(pathname: string) {
  const isPublic = routeConfig.public.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  const isProtected = routeConfig.protected.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  const isAdmin = routeConfig.admin.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  const requiresEmailVerification = routeConfig.emailVerificationRequired.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  const requiresKyc = routeConfig.kycRequired.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  return {
    isPublic,
    isProtected,
    isAdmin,
    requiresEmailVerification,
    requiresKyc,
    requiresAuth: isProtected || isAdmin
  }
}
