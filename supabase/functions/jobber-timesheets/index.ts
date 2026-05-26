// Edge function: jobber-timesheets
// Authenticated. Pulls timesheet entries for a date range, refreshing token if needed.
//
// Query params:
//   start  ISO date (inclusive)  e.g. 2026-05-17
//   end    ISO date (inclusive)  e.g. 2026-05-23
//
// Response shape:
//   { entries: [{ id, startAt, endAt, hours, userId, userName, visitTitle, note }] }
//
// NOTE: Jobber's exact GraphQL field names may differ from what's coded below
// (their schema evolves). If the request fails with "Field X doesn't exist on Type Y",
// adjust TIMESHEETS_QUERY to match your Jobber API version.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, env, jobberGraphQL, refreshAccessToken } from '../_shared/jobber.ts';

const TIMESHEETS_QUERY = `
  query Timesheets($first: Int, $after: String, $filter: TimeSheetEntriesFilterAttributes) {
    timeSheetEntries(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          startAt
          endAt
          finalDuration
          user {
            id
            name { full }
          }
          visit {
            id
            title
            client { name }
          }
          note
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface TimesheetEdge {
  node: {
    id: string;
    startAt: string;
    endAt: string | null;
    finalDuration: number | null; // seconds
    user: { id: string; name: { full: string } };
    visit: { id: string; title: string; client?: { name: string } | null } | null;
    note: string | null;
  };
}

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
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    if (!start || !end) {
      return new Response(JSON.stringify({ error: 'start and end query params required (ISO date)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load this user's stored Jobber tokens
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('jobber_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userData.user.id)
      .single();
    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: 'not_connected' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Refresh access token if expired (or within 60s of expiring)
    let accessToken = tokenRow.access_token;
    const expiresMs = new Date(tokenRow.expires_at).getTime();
    if (Date.now() > expiresMs - 60_000) {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      accessToken = refreshed.access_token;
      await supabase.from('jobber_tokens').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('user_id', userData.user.id);
    }

    // Debug mode: ?debug=1 returns the shape of Iso8601DateTimeRangeInput so we know the right field names
    if (url.searchParams.get('debug') === '1') {
      const introspection = await jobberGraphQL(accessToken, `
        query Introspect {
          __type(name: "Iso8601DateTimeRangeInput") {
            name
            inputFields { name type { name kind ofType { name kind } } }
          }
          filterType: __type(name: "TimeSheetEntriesFilterAttributes") {
            name
            inputFields { name type { name kind ofType { name kind } } }
          }
        }
      `);
      return new Response(JSON.stringify({ debug: introspection }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Page through Jobber timesheet entries (with rate-limit handling)
    const startAt = `${start}T00:00:00Z`;
    const endAt = `${end}T23:59:59Z`;
    const entries: TimesheetEdge['node'][] = [];
    let after: string | null = null;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 50; i++) { // hard cap to avoid runaway loops
      let attempt = 0;
      let data: any;
      while (true) {
        try {
          data = await jobberGraphQL(accessToken, TIMESHEETS_QUERY, {
            first: 100,
            after,
            filter: { startAt: { after: startAt, before: endAt } },
          });
          break;
        } catch (err: any) {
          // Retry on throttle with exponential backoff (up to 4 tries)
          if (String(err.message).includes('THROTTLED') && attempt < 4) {
            const wait = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
            await sleep(wait);
            attempt++;
            continue;
          }
          throw err;
        }
      }
      for (const edge of (data.timeSheetEntries.edges as TimesheetEdge[])) {
        entries.push(edge.node);
      }
      if (!data.timeSheetEntries.pageInfo.hasNextPage) break;
      after = data.timeSheetEntries.pageInfo.endCursor;
      // Small delay between pages to stay under Jobber's rate limit
      await sleep(500);
    }

    // Normalize for the client
    const normalized = entries.map((e) => ({
      id: e.id,
      startAt: e.startAt,
      endAt: e.endAt,
      hours: e.finalDuration ? +(e.finalDuration / 3600).toFixed(2) : null,
      userId: e.user.id,
      userName: e.user.name.full,
      visitId: e.visit?.id || null,
      visitTitle: e.visit?.title || null,
      clientName: e.visit?.client?.name || null,
      note: e.note,
    }));

    return new Response(JSON.stringify({ entries: normalized }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
