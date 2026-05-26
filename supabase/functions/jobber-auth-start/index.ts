// Edge function: jobber-auth-start
// Authenticated. Creates a one-time state row, returns the Jobber authorize URL.
// Hub calls this, then redirects window.location to the returned URL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildAuthorizeUrl, corsHeaders, env, randomState } from '../_shared/jobber.ts';

// Scopes — adjust based on what your Jobber app needs.
// `read_time_sheets` reads timesheet entries; `read_users` resolves the employee name.
// Update these in the Jobber app dashboard AND here to match.
// Jobber's API is read-only for Timesheets — no write_time_sheets scope exists.
// All timesheet edits happen in Jobber's UI; Hub deep-links there.
const SCOPE = 'read_time_sheets read_users read_visits read_clients';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(req.url);
    const redirectTo = url.searchParams.get('redirect_to') || '';
    const state = randomState();

    const { error: insertErr } = await supabase
      .from('jobber_oauth_state')
      .insert({ state, user_id: userData.user.id, redirect_to: redirectTo });
    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ authorize_url: buildAuthorizeUrl(state, SCOPE) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
