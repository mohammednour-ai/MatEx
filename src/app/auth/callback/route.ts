import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL(`/login?error=auth_callback_error`, requestUrl.origin))
      }

      // Successful authentication - redirect to intended destination
      return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
    } catch (err) {
      console.error('Auth callback exception:', err)
      return NextResponse.redirect(new URL(`/login?error=auth_callback_error`, requestUrl.origin))
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/login?error=no_auth_code', requestUrl.origin))
}
