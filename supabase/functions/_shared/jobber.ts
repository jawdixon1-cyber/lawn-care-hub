// Shared helpers for Jobber OAuth + API calls.
// Used by jobber-auth-start, jobber-auth-callback, jobber-timesheets edge functions.

export const JOBBER_AUTHORIZE_URL = 'https://api.getjobber.com/api/oauth/authorize';
export const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';
export const JOBBER_GRAPHQL_URL = 'https://api.getjobber.com/api/graphql';
// Jobber requires a fixed API version header on GraphQL calls.
// Bump this string when Jobber publishes a new version you've tested against.
export const JOBBER_API_VERSION = '2025-01-20';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function randomState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function buildAuthorizeUrl(state: string, scope: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env('JOBBER_CLIENT_ID'),
    redirect_uri: env('JOBBER_REDIRECT_URI'),
    state,
    scope,
  });
  return `${JOBBER_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    client_id: env('JOBBER_CLIENT_ID'),
    client_secret: env('JOBBER_CLIENT_SECRET'),
    grant_type: 'authorization_code',
    code,
    redirect_uri: env('JOBBER_REDIRECT_URI'),
  });
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }>;
}

export async function refreshAccessToken(refresh_token: string) {
  const body = new URLSearchParams({
    client_id: env('JOBBER_CLIENT_ID'),
    client_secret: env('JOBBER_CLIENT_SECRET'),
    grant_type: 'refresh_token',
    refresh_token,
  });
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }>;
}

export async function jobberGraphQL<T>(accessToken: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(JOBBER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-JOBBER-GRAPHQL-VERSION': JOBBER_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Jobber GraphQL ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Jobber GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data as T;
}
