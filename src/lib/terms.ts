import { supabaseServer } from './supabaseServer';

export async function hasUserAcceptedCurrentTerms(userId: string): Promise<boolean> {
  try {
    // Find active terms version
    const { data: active, error: activeErr } = await supabaseServer
      .from('terms_versions')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (activeErr || !active) return false;

    const { data: acceptance, error: accErr } = await supabaseServer
      .from('terms_acceptances')
      .select('id')
      .eq('user_id', userId)
      .eq('terms_version_id', active.id)
      .limit(1)
      .single();

    if (accErr || !acceptance) return false;
    return true;
  } catch (error) {
    console.error('Error checking terms acceptance:', error);
    return false;
  }
}
