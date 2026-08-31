// Relative base so the browser stays same-origin and the Vite dev proxy
// (see vite.config.js) forwards /api -> http://localhost:8080 server-side,
// avoiding CORS preflight. For prod, point this at the real API origin and
// enable CORS on the backend.
//
// The ticketing module is mounted under /api/tcket on the shared backend
// (it also hosts LensBridge's endpoints under /api/*) -- verified against
// the live /v3/api-docs, not /api/v1 as an earlier version of this file assumed.
const BASE = '/api/tcket';

const REFRESH_PATH = '/api/auth/refresh-token';

import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  storeTokensFromResponse,
} from './tokenStore';
import { AUTH_DISABLED } from '../lib/devAuth';

// No token in the bypass case, so this already yields no Authorization header —
// requests simply go out unauthenticated, which is what tcketmanage-app expects.
function authHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ------------------------------------------------------------------ *
 * Token refresh, single-flight.
 *
 * When several requests get a 401 at once, only the first performs the
 * refresh; the rest park on `pending` and resume with the new token. Firing
 * one refresh per in-flight request would rotate the refresh token N times
 * concurrently and log the user out.
 * ------------------------------------------------------------------ */

let isRefreshing = false;
let pending = [];

function drainQueue(error, token) {
  const waiters = pending;
  pending = [];
  for (const { resolve, reject } of waiters) {
    if (error || !token) reject(error ?? new Error('Token refresh failed'));
    else resolve(token);
  }
}

function waitForRefresh() {
  return new Promise((resolve, reject) => pending.push({ resolve, reject }));
}

// Performs the refresh itself. Deliberately bare fetch: routing this through
// request() would recurse on its own 401.
async function performRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const res = await fetch(REFRESH_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }

  const accessToken = storeTokensFromResponse(await res.json());
  if (!accessToken) throw new Error('Refresh response contained no access token');
  return accessToken;
}

async function refreshAccessToken() {
  if (isRefreshing) return waitForRefresh();

  isRefreshing = true;
  try {
    const accessToken = await performRefresh();
    drainQueue(null, accessToken);
    return accessToken;
  } catch (error) {
    drainQueue(error, null);
    clearAuth();
    window.location.href = '/signin';
    throw error;
  } finally {
    isRefreshing = false;
  }
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...options.headers,
  };
  let res = await fetch(BASE + path, { ...options, headers });

  // Under the dev bypass a 401 surfaces as a plain error rather than triggering the
  // refresh-then-redirect dance: there are no tokens to rotate, and bouncing to
  // /signin would hide the real cause — an endpoint that does enforce auth — behind
  // a sign-in page the standalone app has no /api/auth to serve.
  if (res.status === 401 && !AUTH_DISABLED && getRefreshToken()) {
    const token = await refreshAccessToken();
    res = await fetch(BASE + path, { ...options, headers: { ...headers, Authorization: `Bearer ${token}` } });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  postForm: (path, formData) => {
    return fetch(BASE + path, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },
};
