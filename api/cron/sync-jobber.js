// Hourly safety-net Jobber sync.
// Webhooks handle near-real-time updates; this cron catches anything missed
// (e.g. webhook failed, Jobber was disconnected briefly, signature mismatch).

import { getSupabaseAdmin } from '../../lib/supabaseAdmin.js';
import { jobberQuery, JobberDisconnectedError } from '../../lib/jobberClient.js';

// Re-use the same logic as the on-demand hub-sync. We keep the implementation
// inline (rather than importing from jobber-data.js) because Vercel's serverless
// bundler treats each route file independently and we want a tight bundle.

function formatAddress(addr) {
  if (!addr) return null;
  return [addr.street1, addr.street2, addr.city, addr.province, addr.postalCode]
    .filter(Boolean).join(', ') || null;
}

const VISITS_QUERY = `
  query SyncVisits($cursor: String, $startISO: ISO8601DateTime!, $endISO: ISO8601DateTime!) {
    visits(first: 50, after: $cursor, filter: { startAt: { after: $startISO, before: $endISO } }) {
      nodes {
        id title startAt endAt completedAt
        property { address { street1 street2 city province postalCode } }
        job {
          id jobNumber jobType jobStatus title total startAt endAt
          visitSchedule { startDate endDate recurrenceSchedule { calendarRule } }
          client { id firstName lastName companyName }
        }
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

function parseRecurrence(calendarRule) {
  if (!calendarRule) return { label: null, visitsPerMonth: null };
  const freqMatch = calendarRule.match(/FREQ=(\w+)/);
  const intervalMatch = calendarRule.match(/INTERVAL=(\d+)/);
  const freq = freqMatch ? freqMatch[1] : null;
  const interval = intervalMatch ? parseInt(intervalMatch[1]) : 1;
  if (freq !== 'WEEKLY') return { label: 'Recurring', visitsPerMonth: null };
  if (interval === 1) return { label: 'W', visitsPerMonth: 30 / 7 };
  if (interval === 2) return { label: 'EOW', visitsPerMonth: 30 / 14 };
  return { label: `Every ${interval} weeks`, visitsPerMonth: 30 / (7 * interval) };
}

async function syncVisits(supabase, sinceDays = 60, untilDays = 90) {
  const now = new Date();
  const startISO = new Date(now.getTime() - sinceDays * 86400000).toISOString();
  const endISO = new Date(now.getTime() + untilDays * 86400000).toISOString();
  let cursor = null, totalVisits = 0, pages = 0;

  const ensureContact = async (jc) => {
    if (!jc?.id) return null;
    const { data: existing } = await supabase
      .from('contacts').select('id').eq('jobber_client_id', jc.id).maybeSingle();
    if (existing?.id) return existing.id;
    const name = [jc.firstName, jc.lastName].filter(Boolean).join(' ') || jc.companyName || 'Unknown';
    const { data, error } = await supabase
      .from('contacts')
      .upsert({ name, jobber_client_id: jc.id }, { onConflict: 'jobber_client_id' })
      .select('id').single();
    if (error) throw new Error(`contact upsert: ${error.message}`);
    return data.id;
  };

  const upsertJob = async (jj, contactId) => {
    if (!jj?.id) return null;
    const typeMap = { ONE_OFF: 'one_off', RECURRING: 'recurring' };
    const statusMap = { ACTIVE: 'active', ARCHIVED: 'archived', LATE: 'active', UPCOMING: 'active', TODAY: 'active', ACTION_REQUIRED: 'active', ON_HOLD: 'active', UNSCHEDULED: 'active', REQUIRES_INVOICING: 'completed', LATE_TO_INVOICE: 'completed', INVOICED: 'completed' };
    const calendarRule = jj.visitSchedule?.recurrenceSchedule?.calendarRule || null;
    const { label: freqLabel, visitsPerMonth } = parseRecurrence(calendarRule);
    const row = {
      contact_id: contactId,
      title: jj.title || null,
      type: typeMap[jj.jobType] || 'one_off',
      status: statusMap[jj.jobStatus] || 'active',
      job_number: jj.jobNumber ? String(jj.jobNumber) : null,
      total_amount: jj.total != null ? Number(jj.total) : null,
      start_date: jj.visitSchedule?.startDate || (jj.startAt ? jj.startAt.slice(0, 10) : null),
      end_date: jj.visitSchedule?.endDate || (jj.endAt ? jj.endAt.slice(0, 10) : null),
      calendar_rule: calendarRule,
      frequency_label: freqLabel,
      visits_per_month: visitsPerMonth,
      source: 'jobber',
      source_id: jj.id,
    };
    const { data, error } = await supabase
      .from('hub_jobs').upsert(row, { onConflict: 'source,source_id' }).select('id').single();
    if (error) throw new Error(`hub_jobs upsert: ${error.message}`);
    return data.id;
  };

  do {
    const data = await jobberQuery(VISITS_QUERY, { cursor, startISO, endISO });
    const nodes = data.visits?.nodes || [];
    pages++;
    for (const v of nodes) {
      const contactId = await ensureContact(v.job?.client);
      const jobId = await upsertJob(v.job, contactId);
      const row = {
        job_id: jobId,
        contact_id: contactId,
        title: v.title || null,
        start_at: v.startAt || null,
        end_at: v.endAt || null,
        completed_at: v.completedAt || null,
        address: formatAddress(v.property?.address),
        status: v.completedAt ? 'completed' : 'scheduled',
        source: 'jobber',
        source_id: v.id,
      };
      const { error } = await supabase
        .from('hub_visits').upsert(row, { onConflict: 'source,source_id' });
      if (error) throw new Error(`hub_visits upsert: ${error.message}`);
      totalVisits++;
    }
    cursor = data.visits?.pageInfo?.hasNextPage ? data.visits.pageInfo.endCursor : null;
    if (cursor) await new Promise((r) => setTimeout(r, 600));
  } while (cursor);

  await supabase
    .from('hub_sync_state')
    .upsert({ key: 'jobber_visits_last_sync', value: { last_synced_at: new Date().toISOString(), via: 'cron' } }, { onConflict: 'key' });

  return { visits: totalVisits, pages };
}

export default async function handler(req, res) {
  // Vercel cron sends a header to authenticate
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const supabase = getSupabaseAdmin();
  const startedAt = Date.now();
  try {
    const result = await syncVisits(supabase);
    const ms = Date.now() - startedAt;
    console.log(`[Cron] Jobber sync: ${result.visits} visits, ${result.pages} pages, ${ms}ms`);
    return res.json({ ok: true, ...result, durationMs: ms });
  } catch (err) {
    console.error('[Cron] Jobber sync failed:', err.message);
    if (err instanceof JobberDisconnectedError || err.code === 'JOBBER_DISCONNECTED') {
      return res.status(200).json({ ok: false, error: 'jobber disconnected', skip: true });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
