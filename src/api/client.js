const BASE = '/api/v1';

export function getToken() {
  return localStorage.getItem('tm-token');
}

export function setToken(token) {
  if (token) localStorage.setItem('tm-token', token);
  else localStorage.removeItem('tm-token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...options.headers,
  };
  const res = await fetch(BASE + path, { ...options, headers });
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
