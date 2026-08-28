// Token and session persistence.
//
// Split out of AuthService so that client.js can read and rotate tokens
// without importing AuthService (which issues its calls through client.js —
// that would be circular).

const ACCESS_KEY = 'tm-token';
const REFRESH_KEY = 'tm-refresh-token';
const TYPE_KEY = 'tm-token-type';
const USER_KEY = 'tm-user';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function isLoggedIn() {
  return !!getAccessToken();
}

export function storeTokens(accessToken, refreshToken, tokenType = 'Bearer') {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(TYPE_KEY, tokenType);
}

// Persists whichever token shape the server sent: POST /api/auth/signin
// returns { token, refreshToken }, POST /api/auth/refresh-token returns
// { accessToken, refreshToken }. Returns the new access token, or null if
// the payload carried no usable pair.
export function storeTokensFromResponse(data) {
  if (!data) return null;
  const accessToken = data.accessToken ?? data.token;
  const refreshToken = data.refreshToken;
  if (!accessToken || !refreshToken) return null;

  storeTokens(accessToken, refreshToken, data.tokenType ?? data.type ?? 'Bearer');
  return accessToken;
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(TYPE_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChange();
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    return null;
  }
}

export function setCurrentUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    notifyAuthChange();
  } catch (error) {
    console.error('Error updating stored user:', error);
  }
}

// Components listen for this to re-read auth state.
export function notifyAuthChange() {
  window.dispatchEvent(new Event('auth-change'));
}
