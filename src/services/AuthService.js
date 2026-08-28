import {
  clearAuth,
  getAccessToken,
  getCurrentUser,
  getRefreshToken,
  isLoggedIn,
  setCurrentUser,
  storeTokensFromResponse,
} from '../api/tokenStore';

// Session and identity for the app.
//
// Talks to /api/auth/* directly (bare fetch, not the /api/tcket-scoped
// client in api/client.js) since auth lives at a different path prefix on
// the shared backend and has to work before any access token exists.

async function authRequest(path, options = {}) {
  const res = await fetch(`/api/auth${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

function toUserInfo(data) {
  return {
    id: data.id,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    verified: data.verified,
    roles: data.roles ?? [],
    permissions: data.permissions ?? [],
  };
}

const AuthService = {
  async login(email, password) {
    try {
      const { ok, status, data } = await authRequest('/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!ok) {
        return { success: false, error: data?.message || 'Login failed', status };
      }
      storeTokensFromResponse(data);
      const user = toUserInfo(data);
      setCurrentUser(user);
      return { success: true, user };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  },

  async logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await authRequest('/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Local state clears even if the server call fails: the user asked to
      // be signed out, and a stale token here is worse than an orphaned one there.
      clearAuth();
    }
  },

  // Validates the stored access token. Does NOT refresh on failure --
  // initializeAuth relies on this returning null so it can decide whether to
  // attempt a refresh.
  async validateToken() {
    const accessToken = getAccessToken();
    if (!accessToken) return null;
    try {
      const res = await fetch('/api/auth/validate-token', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.valid ? toUserInfo(data) : null;
    } catch (err) {
      console.error('Token validation error:', err);
      return null;
    }
  },

  // Restores a session on app start: validate the access token, and if that
  // fails fall back to the refresh token before giving up.
  async initializeAuth() {
    try {
      const user = await this.validateToken();
      if (user) {
        setCurrentUser(user);
        return { success: true, user };
      }

      if (getRefreshToken()) {
        try {
          const { ok, data } = await authRequest('/refresh-token', {
            method: 'POST',
            body: JSON.stringify({ refreshToken: getRefreshToken() }),
          });
          if (ok && storeTokensFromResponse(data)) {
            const refreshedUser = await this.validateToken();
            if (refreshedUser) {
              setCurrentUser(refreshedUser);
              return { success: true, user: refreshedUser };
            }
          }
        } catch (err) {
          console.error('Token refresh during initialization failed:', err);
        }
      }

      clearAuth();
      return { success: false, user: null };
    } catch (err) {
      console.error('Auth initialization error:', err);
      clearAuth();
      return { success: false, user: null };
    }
  },

  getCurrentUser,
  isLoggedIn,
};

export default AuthService;
