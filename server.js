const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'lifeplus.db');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL UNIQUE,
    telegram_name TEXT DEFAULT '',
    telegram_username TEXT DEFAULT '',
    nickname TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    gender TEXT DEFAULT 'male',
    cash INTEGER NOT NULL DEFAULT 1000,
    bank INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    pos_x REAL NOT NULL DEFAULT 200,
    pos_y REAL NOT NULL DEFAULT 600,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );
`);

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static(__dirname));

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseTelegramInitData(initData) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN не налаштований на сервері.');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
  const calculated = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const a = Buffer.from(calculated, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Недійсний Telegram initData.');

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > 86400) throw new Error('Telegram initData застарів.');

  const user = JSON.parse(params.get('user') || '{}');
  if (!user.id) throw new Error('У Telegram initData немає користувача.');
  return {
    id: String(user.id),
    name: user.first_name || '',
    username: user.username || ''
  };
}

function getIdentity(body) {
  if (body.initData) return parseTelegramInitData(body.initData);
  const id = String(body.telegramId || '');
  if (id.startsWith('local-')) return { id, name: '', username: '' };
  throw new Error('Потрібні підтверджені дані Telegram.');
}

function publicPlayer(row) {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    telegramName: row.telegram_name,
    username: row.telegram_username,
    nickname: row.nickname,
    gender: row.gender,
    cash: row.cash,
    bank: row.bank,
    level: row.level,
    xp: row.xp,
    posX: row.pos_x,
    posY: row.pos_y,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createSession(playerId) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256(raw);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
  db.prepare('INSERT INTO sessions (player_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(playerId, tokenHash, expires);
  return raw;
}

function authPlayer(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Не авторизовано.' });

  const row = db.prepare(`
    SELECT p.* FROM sessions s
    JOIN players p ON p.id = s.player_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(sha256(token), new Date().toISOString());
  if (!row) return res.status(401).json({ error: 'Сесія завершена. Увійдіть знову.' });
  req.player = row;
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: true, version: '0.3.0' }));

app.post('/api/register', (req, res) => {
  try {
    const { nickname, password } = req.body || {};
    if (typeof nickname !== 'string' || nickname.trim().length < 2 || nickname.trim().length > 20) {
      return res.status(400).json({ error: 'Нікнейм має містити 2–20 символів.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Пароль має містити щонайменше 6 символів.' });
    }
    const identity = getIdentity(req.body);
    const nick = nickname.trim();
    const passwordHash = hashPassword(password);

    const exists = db.prepare('SELECT id FROM players WHERE telegram_id = ? OR nickname = ?').get(identity.id, nick);
    if (exists) return res.status(409).json({ error: 'Такий Telegram ID або нікнейм уже зареєстрований.' });

    const info = db.prepare(`
      INSERT INTO players (telegram_id, telegram_name, telegram_username, nickname, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `).run(identity.id, identity.name, identity.username, nick, passwordHash);

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(info.lastInsertRowid);
    const token = createSession(player.id);
    res.status(201).json({ token, profile: publicPlayer(player) });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Не вдалося зареєструвати профіль.' });
  }
});

app.post('/api/login', (req, res) => {
  try {
    const { password } = req.body || {};
    if (typeof password !== 'string' || !password) return res.status(400).json({ error: 'Введи пароль.' });
    const identity = getIdentity(req.body);
    const player = db.prepare('SELECT * FROM players WHERE telegram_id = ?').get(identity.id);
    if (!player || !verifyPassword(password, player.password_hash)) {
      return res.status(401).json({ error: 'Неправильний пароль або профіль не знайдено.' });
    }
    const token = createSession(player.id);
    res.json({ token, profile: publicPlayer(player) });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Не вдалося виконати вхід.' });
  }
});

app.get('/api/profile', authPlayer, (req, res) => res.json({ profile: publicPlayer(req.player) }));

app.patch('/api/profile', authPlayer, (req, res) => {
  const body = req.body || {};
  const allowed = {};
  if (body.gender === 'male' || body.gender === 'female') allowed.gender = body.gender;
  if (Number.isFinite(Number(body.cash)) && Number(body.cash) >= 0) allowed.cash = Math.floor(Number(body.cash));
  if (Number.isFinite(Number(body.bank)) && Number(body.bank) >= 0) allowed.bank = Math.floor(Number(body.bank));
  if (Number.isFinite(Number(body.level)) && Number(body.level) >= 1) allowed.level = Math.floor(Number(body.level));
  if (Number.isFinite(Number(body.xp)) && Number(body.xp) >= 0) allowed.xp = Math.floor(Number(body.xp));
  if (Number.isFinite(Number(body.posX))) allowed.pos_x = Number(body.posX);
  if (Number.isFinite(Number(body.posY))) allowed.pos_y = Number(body.posY);
  if (!Object.keys(allowed).length) return res.json({ profile: publicPlayer(req.player) });

  const sets = Object.keys(allowed).map(key => `${key} = ?`).join(', ');
  const values = Object.values(allowed);
  values.push(new Date().toISOString(), req.player.id);
  db.prepare(`UPDATE players SET ${sets}, updated_at = ? WHERE id = ?`).run(...values);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.player.id);
  res.json({ profile: publicPlayer(player) });
});

app.post('/api/logout', authPlayer, (req, res) => {
  const token = (req.get('authorization') || '').slice(7);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.json({ ok: true });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Life+ RP v0.3.0 listening on port ${PORT}`);
  console.log(`SQLite: ${DB_PATH}`);
});
