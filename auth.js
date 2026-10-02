const LifePlusAuth = (() => {
  const KEY = 'lifeplus_profile_v1';
  const SESSION = 'lifeplus_session_v1';

  function tgUser() {
    const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (u?.id) return { id: String(u.id), name: u.first_name || '', username: u.username || '' };
    return { id: 'local-' + (localStorage.getItem('lifeplus_local_id') || crypto.randomUUID()), name: '', username: '' };
  }

  async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getProfile() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
  function saveProfile(profile) { localStorage.setItem(KEY, JSON.stringify(profile)); }

  async function register(nick, password) {
    const tg = tgUser();
    if (!nick || nick.length < 2 || nick.length > 20) throw new Error('Нікнейм має містити 2–20 символів.');
    if (password.length < 6) throw new Error('Пароль має містити щонайменше 6 символів.');
    const profile = {
      telegramId: tg.id,
      telegramName: tg.name,
      username: tg.username,
      nickname: nick,
      passwordHash: await hashPassword(password),
      cash: 1000,
      bank: 0,
      level: 1,
      xp: 0,
      createdAt: new Date().toISOString()
    };
    saveProfile(profile);
    sessionStorage.setItem(SESSION, '1');
    return profile;
  }

  async function login(password) {
    const profile = getProfile();
    if (!profile) throw new Error('Профіль не знайдено.');
    const hash = await hashPassword(password);
    if (hash !== profile.passwordHash) throw new Error('Неправильний пароль.');
    sessionStorage.setItem(SESSION, '1');
    return profile;
  }

  function logout() { sessionStorage.removeItem(SESSION); }
  function isLoggedIn() { return sessionStorage.getItem(SESSION) === '1'; }
  function hasProfile() { return !!getProfile(); }

  return { register, login, logout, isLoggedIn, hasProfile, getProfile };
})();
