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

  const normalizePhotoUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';

    // Avoid mixed-content blocks when app runs on HTTPS
    if (trimmed.startsWith('http://')) return `https://${trimmed.slice('http://'.length)}`;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    return trimmed;
  };

  const pickFirstString = (...values) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value;
    }
    return '';
  };

  const normalizeUsuario = (usuario) => {
    if (!usuario || typeof usuario !== 'object') return usuario;

    // Some flows return only one of these fields; other providers use different names.
    const rawPhoto = pickFirstString(
      usuario.foto_perfil_url,
      usuario.foto_perfilUrl,
      usuario.foto_perfil,
      usuario.fotoPerfil,
      usuario.avatar_url,
      usuario.avatarUrl,
      usuario.avatar,
      usuario.picture,
      usuario.pictureUrl,
      usuario.profile_picture,
      usuario.profilePicture,
      usuario.photo,
      usuario.photoUrl,
      usuario.imagem_url,
      usuario.imagemUrl,
      usuario.imagem
    );

    const photoUrl = normalizePhotoUrl(rawPhoto);
    if (photoUrl) {
      if (!usuario.foto_perfil) usuario.foto_perfil = photoUrl;
      if (!usuario.foto_perfil_url) usuario.foto_perfil_url = photoUrl;
    }

    return usuario;
  };

  const setAuth = ({ accessToken, userId, usuario }) => {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (typeof userId === 'number') localStorage.setItem(USER_ID_KEY, String(userId));
    if (usuario) localStorage.setItem(USER_KEY, JSON.stringify(normalizeUsuario(usuario)));
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    // keep currentUser cleanup for compatibility with existing code
    localStorage.removeItem(USER_KEY);
  };

  const normalizeBase64 = (input) => {
    // Support URL-safe base64 and missing padding.
    // Also handle '+' being converted to spaces by querystring parsing.
    const value = String(input)
      .trim()
      .replace(/ /g, '+')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
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
