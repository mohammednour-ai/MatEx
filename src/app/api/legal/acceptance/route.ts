import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';
import { allowRequest, getRateLimitStatus } from '@/lib/rateLimiter';

// GET: Check user's legal compliance status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`legal_acceptance_get:${ip}`, 20, 60_000)) {
      const status = getRateLimitStatus(
        `legal_acceptance_get:${ip}`,
        20,
        60_000
      );
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(
              Math.ceil((status.reset - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    // Get user from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current active terms version
    const { data: activeTerms, error: termsError } = await supabaseServer
      .from('terms_versions')
      .select('id, version, title, effective_date')
      .eq('type', 'terms_of_service')
      .eq('is_active', true)
      .single();

    if (termsError || !activeTerms) {
      return NextResponse.json(
        { success: false, error: 'No active terms found' },
        { status: 404 }
      );
    }

    // Check if user has accepted current terms
    const { data: acceptance, error: acceptanceError } = await supabaseServer
      .from('terms_acceptances')
      .select('id, accepted_at, ip_address, user_agent, acceptance_method')
      .eq('user_id', userId)
      .eq('terms_version_id', activeTerms.id)
      .single();

    const hasAccepted = !acceptanceError && !!acceptance;

    return NextResponse.json({
      success: true,
      data: {
        current_terms: {
          id: activeTerms.id,
          version: activeTerms.version,
          title: activeTerms.title,
          effective_date: activeTerms.effective_date,
        },
        has_accepted: hasAccepted,
        acceptance: hasAccepted
          ? {
              accepted_at: acceptance.accepted_at,
              ip_address: acceptance.ip_address,
              user_agent: acceptance.user_agent,
              acceptance_method: acceptance.acceptance_method,
            }
          : null,
        compliance_required: !hasAccepted,
      },
    });
  } catch (error) {
    console.error('Error checking legal compliance:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Record user acceptance of terms
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`legal_acceptance_post:${ip}`, 5, 60_000)) {
      const status = getRateLimitStatus(
        `legal_acceptance_post:${ip}`,
        5,
        60_000
      );
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(
              Math.ceil((status.reset - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    // Validate request body
    const AcceptanceSchema = z.object({
      terms_version_id: z.string().uuid(),
      acceptance_method: z.enum(['modal', 'page', 'api']).default('modal'),
    });

    const raw = await request.json().catch(() => null);
    const parsed = AcceptanceSchema.safeParse(raw);

    if (!parsed.success) {
      const errors = parsed.error.flatten();
      const message = [
        ...(errors.formErrors || []),
        ...Object.values(errors.fieldErrors || {}).flatMap(v => v || []),
      ].join('; ');

      return NextResponse.json(
        { success: false, error: 'Invalid request', message },
        { status: 400 }
      );
    }

    const { terms_version_id, acceptance_method } = parsed.data;

    // Get user from headers
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify terms version exists and is active
    const { data: termsVersion, error: termsError } = await supabaseServer
      .from('terms_versions')
      .select('id, version, title, is_active')
      .eq('id', terms_version_id)
      .single();

    if (termsError || !termsVersion) {
      return NextResponse.json(
        { success: false, error: 'Terms version not found' },
        { status: 404 }
      );
    }

    if (!termsVersion.is_active) {
      return NextResponse.json(
        { success: false, error: 'Terms version is not active' },
        { status: 400 }
      );
    }

    // Check if user has already accepted this version
    const { data: existingAcceptance } = await supabaseServer
      .from('terms_acceptances')
      .select('id')
      .eq('user_id', userId)
      .eq('terms_version_id', terms_version_id)
      .single();

    if (existingAcceptance) {
      return NextResponse.json(
        {
          success: true,
          message: 'Terms already accepted',
          already_accepted: true,
        },
        { status: 200 }
      );
    }

    // Record acceptance
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const { data: acceptance, error: acceptanceError } = await supabaseServer
      .from('terms_acceptances')
      .insert({
        user_id: userId,
        terms_version_id: terms_version_id,
        ip_address: ip,
        user_agent: userAgent,
        acceptance_method: acceptance_method,
      })
      .select('id, accepted_at')
      .single();

    if (acceptanceError) {
      console.error('Error recording terms acceptance:', acceptanceError);
      return NextResponse.json(
        { success: false, error: 'Failed to record acceptance' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Terms acceptance recorded successfully',
      data: {
        acceptance_id: acceptance.id,
        accepted_at: acceptance.accepted_at,
        terms_version: {
          id: termsVersion.id,
          version: termsVersion.version,
          title: termsVersion.title,
        },
      },
    });
  } catch (error) {
    console.error('Error recording legal acceptance:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
