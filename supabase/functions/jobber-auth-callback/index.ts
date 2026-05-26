// Edge function: jobber-auth-callback
// Public (Jobber redirects here). Looks up state -> user_id, exchanges code, stores tokens,
// redirects user's browser back to hub.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, env, exchangeCodeForTokens } from '../_shared/jobber.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  // Fallback redirect target if state lookup fails
  const fallback = env('HUB_URL') + '/timesheets?connect=error';

  if (errorParam) return Response.redirect(`${env('HUB_URL')}/timesheets?connect=denied`, 302);
  if (!code || !state) return Response.redirect(`${env('HUB_URL')}/timesheets?connect=missing`, 302);

  try {
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

    // Look up state -> user_id
    const { data: stateRow, error: stateErr } = await supabase
      .from('jobber_oauth_state')
      .select('user_id, redirect_to, created_at')
      .eq('state', state)
      .single();
    if (stateErr || !stateRow) return Response.redirect(`${env('HUB_URL')}/timesheets?connect=bad_state`, 302);

    // Reject states older than 10 min
    const age = Date.now() - new Date(stateRow.created_at).getTime();
    if (age > 10 * 60 * 1000) {
      await supabase.from('jobber_oauth_state').delete().eq('state', state);
      return Response.redirect(`${env('HUB_URL')}/timesheets?connect=expired`, 302);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    console.log('jobber token response keys:', Object.keys(tokens || {}));
    console.log('jobber token response sample:', JSON.stringify({ ...tokens, access_token: tokens?.access_token ? '[redacted]' : null, refresh_token: tokens?.refresh_token ? '[redacted]' : null }));
    // Jobber sometimes omits expires_in or returns it as a string. Default to 1 hour.
    const expiresInSeconds = Number(tokens.expires_in) || 3600;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error(`Bad token response from Jobber: ${JSON.stringify(tokens)}`);
    }

    // Upsert tokens for this user
    const { error: upsertErr } = await supabase.from('jobber_tokens').upsert({
      user_id: stateRow.user_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (upsertErr) throw upsertErr;

    // Clean up the used state row
    await supabase.from('jobber_oauth_state').delete().eq('state', state);

    const target = stateRow.redirect_to || `${env('HUB_URL')}/timesheets?connect=ok`;
    return Response.redirect(target, 302);
  } catch (err) {
    console.error('callback error', err);
    return Response.redirect(fallback, 302);
  }
});
