// Hourly safety-net Jobber sync.
// Webhooks handle near-real-time updates; this cron catches anything missed
// (webhook failed, Jobber was disconnected briefly, signature mismatch, etc).
// Window is intentionally narrow — webhooks cover the rest.

import { getSupabaseAdmin } from '../../lib/supabaseAdmin.js';
import { syncJobberVisits } from '../jobber-data.js';
import { JobberDisconnectedError } from '../../lib/jobberClient.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const supabase = getSupabaseAdmin();
  const startedAt = Date.now();
  try {
    // Tight window — webhooks handle real-time, this just catches stragglers.
    const result = await syncJobberVisits(supabase, 7, 14);
    const ms = Date.now() - startedAt;
    console.log(`[Cron] Jobber sync: ${result.visits} visits, ${result.jobs} jobs, ${result.pages} pages, ${ms}ms`);
    return res.json({ ok: true, ...result, durationMs: ms });
  } catch (err) {
    console.error('[Cron] Jobber sync failed:', err.message);
    if (err instanceof JobberDisconnectedError || err.code === 'JOBBER_DISCONNECTED') {
      return res.status(200).json({ ok: false, error: 'jobber disconnected', skip: true });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
