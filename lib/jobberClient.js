import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseAdmin } from './supabaseAdmin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = join(__dirname, '..', '.jobber-tokens.json');

const JOBBER_GRAPHQL_URL = 'https://api.getjobber.com/api/graphql';


// ── Token Management (file + Supabase fallback) ──

async function readTokenData() {
  // Prefer Supabase (always up-to-date, works on Vercel)
  try {
    const db = getSupabaseAdmin();
    const { data } = await db
      .from('app_tokens')
      .select('value, org_id')
      .eq('key', 'jobber')
      .maybeSingle();
    if (data?.value?.access_token) {
      // Stash org_id so saveTokenData can include it
      data.value._org_id = data.org_id;
      return data.value;
    }
  } catch {}

  // Fallback to local file (dev only)
  try {
    if (existsSync(TOKENS_PATH)) {
      const data = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));
      if (data?.access_token) return data;
    }
  } catch {}

  return null;
}

async function saveTokenData(tokenData) {
  // Save to local file (dev)
  try {
    writeFileSync(TOKENS_PATH, JSON.stringify(tokenData, null, 2));
  } catch {}

  // Save to Supabase (production/Vercel)
  try {
    const db = getSupabaseAdmin();
    const payload = {
      key: 'jobber',
      value: tokenData,
      updated_at: new Date().toISOString(),
    };
    if (tokenData._org_id) payload.org_id = tokenData._org_id;
    await db.from('app_tokens').upsert(payload, { onConflict: 'key' });
  } catch (err) {
    console.error('[Jobber] Failed to save token to Supabase:', err.message);
  }
}

// Update only error/log fields — never touch access_token / refresh_token.
// Used when a refresh attempt fails so we don't clobber a good token written
// by a parallel process.
async function logRefreshError(message) {
  try {
    const db = getSupabaseAdmin();
    const { data } = await db.from('app_tokens').select('value, org_id').eq('key', 'jobber').maybeSingle();
    if (!data?.value) return;
    const merged = {
      ...data.value,
      last_refresh_error: message,
      last_refresh_attempt: new Date().toISOString(),
    };
    const payload = { key: 'jobber', value: merged, updated_at: new Date().toISOString() };
    if (data.org_id) payload.org_id = data.org_id;
    await db.from('app_tokens').upsert(payload, { onConflict: 'key' });
  } catch (err) {
    console.error('[Jobber] logRefreshError failed:', err.message);
  }
}

// Distributed advisory lock via Supabase. Only one process refreshes at a time
// so we never burn the refresh_token by hitting Jobber with the same token twice.
// Returns true if we acquired the lock, false if someone else holds it.
async function tryAcquireRefreshLock(ttlMs = 30000) {
  try {
    const db = getSupabaseAdmin();
    const lockUntil = new Date(Date.now() + ttlMs).toISOString();
    const { data, error } = await db.from('app_tokens').select('value, org_id').eq('key', 'jobber').maybeSingle();
    if (error || !data?.value) return false;
    const existingLock = data.value.refresh_lock_until;
    if (existingLock && new Date(existingLock) > new Date()) return false; // someone else holds it
    const merged = { ...data.value, refresh_lock_until: lockUntil };
    const payload = { key: 'jobber', value: merged, updated_at: new Date().toISOString() };
    if (data.org_id) payload.org_id = data.org_id;
    const { error: upErr } = await db.from('app_tokens').upsert(payload, { onConflict: 'key' });
    return !upErr;
  } catch {
    return false;
  }
}

async function releaseRefreshLock() {
  try {
    const db = getSupabaseAdmin();
    const { data } = await db.from('app_tokens').select('value, org_id').eq('key', 'jobber').maybeSingle();
    if (!data?.value) return;
    const merged = { ...data.value, refresh_lock_until: null };
    const payload = { key: 'jobber', value: merged, updated_at: new Date().toISOString() };
    if (data.org_id) payload.org_id = data.org_id;
    await db.from('app_tokens').upsert(payload, { onConflict: 'key' });
  } catch {}
}

async function refreshAccessToken(tokenData) {
  const clientId = (process.env.JOBBER_CLIENT_ID || '').trim();
  const clientSecret = (process.env.JOBBER_CLIENT_SECRET || '').trim();
  const reason = !clientId ? 'JOBBER_CLIENT_ID not set' : !clientSecret ? 'JOBBER_CLIENT_SECRET not set' : !tokenData?.refresh_token ? 'no refresh_token stored' : null;
  if (reason) {
    console.error('[Jobber] Cannot refresh:', reason);
    await logRefreshError(reason);
    return null;
  }

  // Try to grab the distributed refresh lock. If another process is already
  // refreshing, wait for it to finish and use the token *it* writes.
  const gotLock = await tryAcquireRefreshLock(30000);
  if (!gotLock) {
    console.log('[Jobber] Another process is refreshing — waiting and re-reading...');
    // Poll for up to 15s for the other process to finish
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const fresh = await readTokenData();
      const wasFresher = fresh?.refreshed_at && (!tokenData.refreshed_at || new Date(fresh.refreshed_at) > new Date(tokenData.refreshed_at));
      if (wasFresher && fresh.access_token) {
        console.log('[Jobber] Got fresh token from sibling process');
        process.env.JOBBER_API_TOKEN = fresh.access_token;
        return fresh.access_token;
      }
    }
    console.warn('[Jobber] Sibling refresh timed out, giving up');
    return null;
  }

  try {
    console.log('[Jobber] Refreshing access token...');
    // Re-read inside the lock to get the freshest refresh_token
    // (might have been updated by a recently completed refresh).
    const latest = await readTokenData();
    const refreshTokenToUse = latest?.refresh_token || tokenData.refresh_token;
    let res;
    try {
      res = await fetch('https://api.getjobber.com/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshTokenToUse,
        }),
      });
    } catch (err) {
      const msg = `Network error: ${err.message}`;
      console.error('[Jobber] Token refresh network failure:', err);
      await logRefreshError(msg);
      return null;
    }

    if (!res.ok) {
      const body = await res.text();
      const msg = `HTTP ${res.status}: ${body.slice(0, 300)}`;
      console.error('[Jobber] Token refresh failed:', msg);
      // CRITICAL: don't overwrite tokens on failure — only log the error.
      // This prevents clobbering a good token that a sibling process just wrote.
      await logRefreshError(msg);
      return null;
    }

    const tokens = await res.json();
    const updated = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshTokenToUse,
      expires_at: Date.now() + (tokens.expires_in || 7200) * 1000,
      connected_at: latest?.connected_at || tokenData.connected_at,
      refreshed_at: new Date().toISOString(),
      last_refresh_attempt: new Date().toISOString(),
      last_refresh_error: null,
      refresh_lock_until: null,
      _org_id: latest?._org_id || tokenData._org_id,
    };

    await saveTokenData(updated);
    process.env.JOBBER_API_TOKEN = updated.access_token;
    console.log('[Jobber] Token refreshed successfully');
    return updated.access_token;
  } finally {
    await releaseRefreshLock();
  }
}

let refreshPromise = null;

async function getJobberToken() {
  const tokenData = await readTokenData();
  if (!tokenData?.access_token) return null;

  // Refresh proactively 5 min before expiry — gives us margin against cold starts
  // and concurrent calls. Distributed lock inside refreshAccessToken handles races.
  if (tokenData.expires_at && Date.now() > tokenData.expires_at - 5 * 60 * 1000) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken(tokenData).finally(() => { refreshPromise = null; });
    }
    const newToken = await refreshPromise;
    if (newToken) return newToken;
  }

  process.env.JOBBER_API_TOKEN = tokenData.access_token;
  return tokenData.access_token;
}

// Custom error for disconnected/expired Jobber tokens
export class JobberDisconnectedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JobberDisconnectedError';
    this.code = 'JOBBER_DISCONNECTED';
  }
}

export async function jobberStatus() {
  const tokenData = await readTokenData();
  if (!tokenData?.access_token) return { connected: false };
  return {
    connected: true,
    connected_at: tokenData.connected_at || null,
    refreshed_at: tokenData.refreshed_at || null,
    expires_at: tokenData.expires_at || null,
    has_refresh_token: !!tokenData.refresh_token,
    last_refresh_error: tokenData.last_refresh_error || null,
    last_refresh_attempt: tokenData.last_refresh_attempt || null,
    has_client_id: !!(process.env.JOBBER_CLIENT_ID || '').trim(),
    has_client_secret: !!(process.env.JOBBER_CLIENT_SECRET || '').trim(),
  };
}

// Exposed for manual refresh from UI — returns the new status after the attempt
export async function forceRefresh() {
  const tokenData = await readTokenData();
  if (!tokenData?.access_token) return { ok: false, error: 'Not connected — nothing to refresh.' };
  if (!tokenData.refresh_token) return { ok: false, error: 'Connected but no refresh_token stored. Full reconnect required.' };
  refreshPromise = null;
  const newToken = await refreshAccessToken({ ...tokenData, expires_at: 0 });
  const updated = await readTokenData();
  if (newToken) return { ok: true, status: await jobberStatus() };
  return { ok: false, error: updated?.last_refresh_error || 'Refresh failed (see server logs)', status: await jobberStatus() };
}

export async function jobberQuery(query, variables = {}, retryCount = 0) {
  const token = await getJobberToken();
  if (!token) throw new JobberDisconnectedError('Jobber is not connected. Reconnect in Settings.');

  const res = await fetch(JOBBER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401 && retryCount === 0) {
    // Token rejected — force refresh and retry once
    console.log('[Jobber] 401 received, forcing token refresh...');
    const tokenData = await readTokenData();
    if (tokenData) {
      tokenData.expires_at = 0; // Force expiry
      refreshPromise = null;
      const newToken = await refreshAccessToken(tokenData);
      if (newToken) return jobberQuery(query, variables, 1);
    }
    throw new JobberDisconnectedError('Jobber session expired. Reconnect in Settings.');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jobber API ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors[0].message;
    // Auto-retry throttle errors with a delay (up to 2 retries)
    // Don't retry throttle — fail fast, let the frontend handle it
    throw new Error(`Jobber GraphQL: ${msg}`);
  }
  return json.data;
}
