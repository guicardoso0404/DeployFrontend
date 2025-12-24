// Global Auth/API helper (no build step; attach to window)
(() => {
  const TOKEN_KEY = 'accessToken';
  const USER_ID_KEY = 'userId';
  const USER_KEY = 'currentUser';

  const getAccessToken = () => localStorage.getItem(TOKEN_KEY) || '';
  const getUserId = () => {
    const raw = localStorage.getItem(USER_ID_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };

  const setAuth = ({ accessToken, userId, usuario }) => {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (typeof userId === 'number') localStorage.setItem(USER_ID_KEY, String(userId));
    if (usuario) localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    // keep currentUser cleanup for compatibility with existing code
    localStorage.removeItem(USER_KEY);
  };

  const normalizeBase64 = (input) => {
    // Support URL-safe base64 and missing padding
    const value = String(input).replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (value.length % 4)) % 4;
    return value + '='.repeat(padLength);
  };

  const decodeAuthQueryPayload = (authParam) => {
    if (!authParam) return null;
    try {
      const json = atob(normalizeBase64(authParam));
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const withAuthHeader = (headersInit) => {
    const token = getAccessToken();
    const headers = new Headers(headersInit || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  };

  const authFetch = async (url, options = {}) => {
    const token = getAccessToken();
    if (!token) {
      throw new Error('Você precisa estar logado para realizar esta ação.');
    }

    const headers = withAuthHeader(options.headers);

    // If sending JSON, ensure content-type is present
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, { ...options, headers });
  };

  window.Auth = {
    getAccessToken,
    getUserId,
    setAuth,
    clearAuth,
    decodeAuthQueryPayload,
    authFetch,
  };
})();
