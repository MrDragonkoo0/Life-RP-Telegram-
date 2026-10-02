const LifePlusAuth = (() => {
  const TOKEN_KEY = 'lifeplus_session_token_v2';
  const PROFILE_KEY = 'lifeplus_profile_cache_v2';
  const LOCAL_ID_KEY = 'lifeplus_local_id';

  function tgUser() {
    const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (u?.id) return { id: String(u.id), name: u.first_name || '', username: u.username || '' };
    let id = localStorage.getItem(LOCAL_ID_KEY);
    if (!id) {
      id = 'local-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now());
      localStorage.setItem(LOCAL_ID_KEY, id);
    }
    return { id, name: '', username: '' };
  }

  function initData() {
    return window.Telegram?.WebApp?.initData || '';
  }

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function saveSession(token, profile) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
  }
  function getProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; }
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(path, { ...options, headers });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.error || 'Помилка сервера.');
    return data;
  }

  function identityPayload(extra = {}) {
    return { ...extra, initData: initData(), telegramId: tgUser().id };
  }

  async function register(nick, password) {
    if (!nick || nick.length < 2 || nick.length > 20) throw new Error('Нікнейм має містити 2–20 символів.');
    if (password.length < 6) throw new Error('Пароль має містити щонайменше 6 символів.');
    const data = await api('/api/register', {
      method: 'POST',
      body: JSON.stringify(identityPayload({ nickname: nick, password }))
    });
    saveSession(data.token, data.profile);
    return data.profile;
  }

  async function login(password) {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify(identityPayload({ password }))
    });
    saveSession(data.token, data.profile);
    return data.profile;
  }

  async function refreshProfile() {
    const data = await api('/api/profile');
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
    return data.profile;
  }

  async function updateProfile(patch) {
    const data = await api('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
    return data.profile;
  }

  async function logout() {
    try { if (getToken()) await api('/api/logout', { method: 'POST' }); } catch (_) {}
    clearSession();
  }

  function isLoggedIn() { return !!getToken() && !!getProfile(); }
  function hasProfile() { return !!getProfile(); }

  return { register, login, logout, isLoggedIn, hasProfile, getProfile, refreshProfile, updateProfile };
})();
