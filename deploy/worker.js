/**
 * Khui AI clone — Worker
 *
 * Serves the built SPA plus an auth / coin / gacha / chat API backed by D1.
 *
 * Auth
 *   POST /api/auth/signup                 { email, name, password }
 *   POST /api/auth/login                  { email, password }
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *   GET  /api/auth/providers
 *   GET  /api/auth/oauth/:provider
 *   GET  /api/auth/callback/:provider
 *
 * Coins
 *   GET  /api/wallet                       -> balance, check-in state, packs, totals
 *   POST /api/wallet/checkin               -> daily check-in reward
 *   POST /api/wallet/topup  { pack }       -> demo top-up pack
 *   GET  /api/wallet/transactions?limit=   -> ledger
 *
 * Gacha
 *   GET  /api/gacha                        -> banner info, pity, collection
 *   POST /api/gacha/pull  { count: 1|10 }  -> draws
 *
 * Chat
 *   GET  /api/chat/:characterId
 *   POST /api/chat/:characterId  { content }
 *
 * Secrets (optional, enable social login when present):
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 *   FACEBOOK_APP_ID  / FACEBOOK_APP_SECRET
 */

const SESSION_COOKIE = 'khui_session';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const START_COINS = 170;
const MESSAGE_COST = 2;
// Workers caps PBKDF2 at 100000 iterations.
const PBKDF2_ITERATIONS = 100000;

/* ---------- coin economy ---------- */

// 7-day cycle, repeats.
const CHECKIN_REWARDS = [20, 25, 30, 35, 40, 50, 100];

// Demo packs: no payment, each pack can be claimed again after its cooldown.
const TOPUP_PACKS = [
  { id: 'daily', coins: 500, label: 'แพ็กคอยน์ประจำวัน', cooldownHours: 24 },
  { id: 'weekly', coins: 1500, label: 'แพ็กคอยน์ประจำสัปดาห์', cooldownHours: 168 },
  { id: 'monthly', coins: 5000, label: 'แพ็กคอยน์ประจำเดือน', cooldownHours: 720 },
];

const TZ_OFFSET = 7 * 3600; // Asia/Bangkok

/* ---------- levels & daily quests ---------- */

const MAX_LEVEL = 99;

// Total XP required to be at `level`. Level 1 starts at 0.
function xpForLevel(level) {
  return 50 * (level - 1) * level;
}

function levelForXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

// Coins granted when reaching `level`.
function levelBonus(level) {
  return 50 + (level - 1) * 50;
}

const XP_CHAT = 5;
const XP_GACHA = 10;
const XP_CHECKIN = 15;

// Progress is derived from existing tables (checkins / messages / gacha_pulls),
// so quests never double-count or drift out of sync.
const DAILY_QUESTS = [
  {
    id: 'checkin',
    kind: 'checkin',
    goal: 1,
    reward: 20,
    xp: 15,
    title: 'เช็คอินประจำวัน',
    desc: 'กดเช็คอินในกระเป๋าคอยน์',
    to: '/wallet',
  },
  {
    id: 'chat5',
    kind: 'chat',
    goal: 5,
    reward: 40,
    xp: 25,
    title: 'ทักทายตัวละคร',
    desc: 'ส่งข้อความ 5 ข้อความ',
    to: '/characters',
  },
  {
    id: 'gacha1',
    kind: 'gacha',
    goal: 1,
    reward: 20,
    xp: 20,
    title: 'ลองมือกาชา',
    desc: 'สุ่มการ์ด 1 ครั้ง',
    to: '/gacha',
  },
  {
    id: 'chat20',
    kind: 'chat',
    goal: 20,
    reward: 120,
    xp: 60,
    title: 'คุยยาวทั้งวัน',
    desc: 'ส่งข้อความรวม 20 ข้อความ',
    to: '/characters',
  },
];

// Limited-time events. Progress is derived from activity inside the window,
// same pattern as quests — no extra counters to keep in sync.
// Example campaigns: adjust ids/dates/rewards when real events are scheduled.
const EVENTS = [
  {
    id: 'halloween-gacha',
    kind: 'gacha',
    goal: 3,
    reward: 150,
    xp: 40,
    title: 'ฮาโลวีน: สุ่มกาชา 3 ครั้ง',
    desc: 'สุ่มการ์ดช่วงเทศกาลฮาโลวีน รับคอยน์คืน 150',
    start: '2026-10-20',
    end: '2026-11-02',
  },
  {
    id: 'chat-marathon',
    kind: 'chat',
    goal: 30,
    reward: 300,
    xp: 80,
    title: 'แชทมาราธอน 30 ข้อความ',
    desc: 'ส่งข้อความรวม 30 ข้อความภายในอีเวนต์ รับ 300 คอยน์',
    start: '2026-10-20',
    end: '2026-11-05',
  },
];

/* ---------- gacha ---------- */

const GACHA_SINGLE = 50;
const GACHA_TEN = 450;
const PITY_SR = 10; // guaranteed SR+ every 10th pull
const PITY_SSR = 80; // guaranteed SSR+ every 80th pull

const RARITIES = [
  { id: 'N', rank: 1, weight: 45 },
  { id: 'R', rank: 2, weight: 30 },
  { id: 'SR', rank: 3, weight: 15 },
  { id: 'SSR', rank: 4, weight: 8 },
  { id: 'UR', rank: 5, weight: 2 },
];

// Must stay in sync with src/data/characters.ts
const CHAR_IDS = [
  'jaokhun',
  'escape-room',
  'hans',
  'nura',
  'mint',
  'khanngern',
  'meen',
  'pudding',
  'nam',
  'namnueng',
  'berry',
  'moji',
];

const TOTAL_CARDS = CHAR_IDS.length * RARITIES.length;

/* ---------- schema ---------- */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id TEXT PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     name TEXT NOT NULL,
     password_hash TEXT,
     provider TEXT NOT NULL DEFAULT 'email',
     avatar_url TEXT,
     coins INTEGER NOT NULL DEFAULT ${START_COINS},
     created_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS oauth_states (
     state TEXT PRIMARY KEY,
     provider TEXT NOT NULL,
     redirect_to TEXT,
     created_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS messages (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT NOT NULL,
     character_id TEXT NOT NULL,
     role TEXT NOT NULL,
     content TEXT NOT NULL,
     created_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_user_char ON messages (user_id, character_id, id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS coin_tx (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT NOT NULL,
     delta INTEGER NOT NULL,
     kind TEXT NOT NULL,
     note TEXT,
     balance_after INTEGER NOT NULL,
     created_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON coin_tx (user_id, id)`,
  `CREATE TABLE IF NOT EXISTS checkins (
     user_id TEXT NOT NULL,
     day TEXT NOT NULL,
     streak INTEGER NOT NULL,
     reward INTEGER NOT NULL,
     created_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, day)
   )`,
  `CREATE TABLE IF NOT EXISTS gacha_state (
     user_id TEXT PRIMARY KEY,
     total_pulls INTEGER NOT NULL DEFAULT 0,
     pity_sr INTEGER NOT NULL DEFAULT 0,
     pity_ssr INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS user_cards (
     user_id TEXT NOT NULL,
     card_id TEXT NOT NULL,
     character_id TEXT NOT NULL,
     rarity TEXT NOT NULL,
     count INTEGER NOT NULL DEFAULT 1,
     first_at INTEGER NOT NULL,
     last_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, card_id)
   )`,
  `CREATE TABLE IF NOT EXISTS gacha_pulls (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT NOT NULL,
     card_id TEXT NOT NULL,
     rarity TEXT NOT NULL,
     cost INTEGER NOT NULL,
     created_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS progress (
     user_id TEXT PRIMARY KEY,
     xp INTEGER NOT NULL DEFAULT 0,
     level INTEGER NOT NULL DEFAULT 1,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS quest_claims (
     user_id TEXT NOT NULL,
     day TEXT NOT NULL,
     quest_id TEXT NOT NULL,
     reward INTEGER NOT NULL,
     created_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, day, quest_id)
   )`,
  `CREATE TABLE IF NOT EXISTS event_claims (
     user_id TEXT NOT NULL,
     event_id TEXT NOT NULL,
     reward INTEGER NOT NULL,
     created_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, event_id)
   )`,
];

let schemaPromise = null;

function ensureSchema(env) {
  if (!schemaPromise) {
    schemaPromise = env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql))).catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

/* ---------- small helpers ---------- */

const now = () => Math.floor(Date.now() / 1000);

function dayKey(t = now()) {
  return new Date((t + TZ_OFFSET) * 1000).toISOString().slice(0, 10);
}

function shiftDay(key, days) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Unix seconds at the start of the current Thai calendar day.
function dayStart(t = now()) {
  return t - ((t + TZ_OFFSET) % 86400);
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function badRequest(message) {
  return json({ error: message }, 400);
}

function unauthorized() {
  return json({ error: 'กรุณาเข้าสู่ระบบ' }, 401);
}

function txStatement(env, userId, delta, kind, note, balanceAfter, t) {
  return env.DB.prepare(
    'INSERT INTO coin_tx (user_id, delta, kind, note, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(userId, delta, kind, note, balanceAfter, t);
}

/**
 * Adds XP (and the matching level-up coin bonus) statements to a batch.
 * Returns the resulting xp/level/bonus so the caller can settle `balance_after`.
 */
async function pushXp(env, statements, userId, gain, t) {
  const row = await env.DB.prepare('SELECT xp, level FROM progress WHERE user_id = ?').bind(userId).first();
  const oldXp = row?.xp ?? 0;
  const xp = oldXp + gain;
  const level = levelForXp(xp);

  let bonus = 0;
  for (let l = levelForXp(oldXp) + 1; l <= level; l += 1) bonus += levelBonus(l);

  statements.push(
    env.DB.prepare(
      `INSERT INTO progress (user_id, xp, level, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET xp = excluded.xp, level = excluded.level, updated_at = excluded.updated_at`,
    ).bind(userId, xp, level, t),
  );

  return { xp, level, bonus };
}

async function questProgress(env, userId, kind, t = now()) {
  if (kind === 'checkin') {
    const row = await env.DB.prepare('SELECT 1 AS done FROM checkins WHERE user_id = ? AND day = ?')
      .bind(userId, dayKey(t))
      .first();
    return row ? 1 : 0;
  }
  if (kind === 'chat') {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND role = 'user' AND created_at >= ?",
    )
      .bind(userId, dayStart(t))
      .first();
    return row?.n || 0;
  }
  if (kind === 'gacha') {
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM gacha_pulls WHERE user_id = ? AND created_at >= ?')
      .bind(userId, dayStart(t))
      .first();
    return row?.n || 0;
  }
  return 0;
}

/* ---------- events ---------- */

function dayKeyToUnix(key) {
  return Math.floor(new Date(`${key}T00:00:00+07:00`).getTime() / 1000);
}

function eventWindow(ev) {
  return { start: dayKeyToUnix(ev.start), end: dayKeyToUnix(shiftDay(ev.end, 1)) - 1 };
}

async function eventProgress(env, userId, ev, window) {
  if (ev.kind === 'gacha') {
    const row = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM gacha_pulls WHERE user_id = ? AND created_at >= ? AND created_at <= ?',
    )
      .bind(userId, window.start, window.end)
      .first();
    return row?.n || 0;
  }
  if (ev.kind === 'chat') {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND role = 'user' AND created_at >= ? AND created_at <= ?",
    )
      .bind(userId, window.start, window.end)
      .first();
    return row?.n || 0;
  }
  if (ev.kind === 'checkin') {
    const row = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM checkins WHERE user_id = ? AND created_at >= ? AND created_at <= ?',
    )
      .bind(userId, window.start, window.end)
      .first();
    return row?.n || 0;
  }
  return 0;
}

/**
 * Single source of truth for everything the user can claim right now:
 * daily check-in, daily quests and limited-time events, plus the header badges.
 */
async function rewardState(env, user, t = now()) {
  const today = dayKey(t);
  const yesterday = shiftDay(today, -1);
  const last = await env.DB.prepare('SELECT day, streak FROM checkins WHERE user_id = ? ORDER BY day DESC LIMIT 1')
    .bind(user.id)
    .first();

  const checkedInToday = Boolean(last && last.day === today);
  const alive = Boolean(last && (last.day === today || last.day === yesterday));
  const streak = alive ? last.streak : 0;
  const nextStreak = checkedInToday ? streak : alive ? streak + 1 : 1;
  const nextCycleDay = ((nextStreak - 1) % CHECKIN_REWARDS.length) + 1;
  const nextReward = CHECKIN_REWARDS[nextCycleDay - 1];

  const chatCount = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND role = 'user' AND created_at >= ?",
  )
    .bind(user.id, dayStart(t))
    .first();
  const gachaCount = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM gacha_pulls WHERE user_id = ? AND created_at >= ?',
  )
    .bind(user.id, dayStart(t))
    .first();

  const { results: claimRows } = await env.DB.prepare(
    'SELECT quest_id FROM quest_claims WHERE user_id = ? AND day = ?',
  )
    .bind(user.id, today)
    .all();
  const claimed = new Set((claimRows || []).map((r) => r.quest_id));
  const progressByKind = {
    checkin: checkedInToday ? 1 : 0,
    chat: chatCount?.n || 0,
    gacha: gachaCount?.n || 0,
  };

  const quests = DAILY_QUESTS.map((q) => {
    const done = Math.min(q.goal, progressByKind[q.kind] || 0);
    const isClaimed = claimed.has(q.id);
    return {
      id: q.id,
      title: q.title,
      desc: q.desc,
      to: q.to,
      goal: q.goal,
      progress: done,
      reward: q.reward,
      xp: q.xp,
      claimed: isClaimed,
      canClaim: !isClaimed && done >= q.goal,
    };
  });

  const { results: eventClaimRows } = await env.DB.prepare('SELECT event_id FROM event_claims WHERE user_id = ?')
    .bind(user.id)
    .all();
  const claimedEvents = new Set((eventClaimRows || []).map((r) => r.event_id));

  const events = [];
  for (const ev of EVENTS) {
    const window = eventWindow(ev);
    const active = t >= window.start && t <= window.end;
    const progress = Math.min(ev.goal, await eventProgress(env, user.id, ev, window));
    const isClaimed = claimedEvents.has(ev.id);
    events.push({
      id: ev.id,
      title: ev.title,
      desc: ev.desc,
      goal: ev.goal,
      progress,
      reward: ev.reward,
      xp: ev.xp,
      start: ev.start,
      end: ev.end,
      active,
      claimed: isClaimed,
      canClaim: active && !isClaimed && progress >= ev.goal,
      daysLeft: active ? Math.max(0, Math.ceil((window.end - t) / 86400)) : 0,
    });
  }

  const notifications = [];
  if (!checkedInToday) {
    notifications.push({
      type: 'checkin',
      id: 'checkin',
      title: `เช็คอินวันนี้รับ ${nextReward} คอยน์`,
      reward: nextReward,
      href: '/wallet',
    });
  }
  for (const q of quests) {
    if (q.canClaim) {
      notifications.push({
        type: 'quest',
        id: q.id,
        title: `${q.title} · +${q.reward}`,
        reward: q.reward,
        href: '/wallet',
      });
    }
  }
  for (const e of events) {
    if (e.canClaim) {
      notifications.push({
        type: 'event',
        id: e.id,
        title: `${e.title} · +${e.reward}`,
        reward: e.reward,
        href: '/wallet',
      });
    }
  }

  return { today, checkedInToday, streak, nextCycleDay, nextReward, quests, events, notifications };
}

/* ---------- crypto helpers ---------- */

function toBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomToken(bytes = 32) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, iterStr, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'pbkdf2') return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromBase64Url(saltB64), iterations: Number(iterStr), hash: 'SHA-256' },
    key,
    256,
  );
  const a = toBase64Url(new Uint8Array(bits));
  return a === hashB64;
}

/* ---------- cookies ---------- */

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

function sessionCookie(token, maxAge = SESSION_TTL) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/* ---------- sessions ---------- */

async function createSession(env, userId) {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const t = now();
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  )
    .bind(tokenHash, userId, t, t + SESSION_TTL)
    .run();
  return token;
}

async function currentUser(request, env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.coins, u.avatar_url, u.provider, COALESCE(p.xp, 0) AS xp
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN progress p ON p.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(tokenHash, now())
    .first();
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    coins: row.coins,
    avatarUrl: row.avatar_url || null,
    provider: row.provider,
    xp: row.xp || 0,
  };
}

function publicUser(user) {
  const xp = user.xp || 0;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    coins: user.coins,
    avatarUrl: user.avatarUrl || null,
    provider: user.provider,
    xp,
    level: levelForXp(xp),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateSignup(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const password = String(body.password || '');
  if (!EMAIL_RE.test(email)) return { error: 'อีเมลไม่ถูกต้อง' };
  if (name.length < 2) return { error: 'กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร' };
  if (password.length < 8) return { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' };
  return { email, name, password };
}

/* ---------- OAuth ---------- */

const PROVIDERS = {
  google: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    clientId: (env) => env.GOOGLE_CLIENT_ID,
    clientSecret: (env) => env.GOOGLE_CLIENT_SECRET,
  },
  facebook: {
    authorize: 'https://www.facebook.com/v21.0/dialog/oauth',
    token: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scope: 'email,public_profile',
    clientId: (env) => env.FACEBOOK_APP_ID,
    clientSecret: (env) => env.FACEBOOK_APP_SECRET,
  },
};

function providerEnabled(env, provider) {
  const cfg = PROVIDERS[provider];
  return Boolean(cfg && cfg.clientId(env) && cfg.clientSecret(env));
}

function originOf(request) {
  return new URL(request.url).origin;
}

function redirectUri(request, provider) {
  return `${originOf(request)}/api/auth/callback/${provider}`;
}

async function fetchGoogleProfile(env, request, code) {
  const tokenRes = await fetch(PROVIDERS.google.token, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(request, 'google'),
    }),
  });
  if (!tokenRes.ok) throw new Error('google token exchange failed');
  const token = await tokenRes.json();
  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!infoRes.ok) throw new Error('google userinfo failed');
  const info = await infoRes.json();
  return { id: info.sub, email: info.email, name: info.name || info.email, avatar: info.picture };
}

async function fetchFacebookProfile(env, request, code) {
  const tokenUrl = new URL(PROVIDERS.facebook.token);
  tokenUrl.search = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID,
    client_secret: env.FACEBOOK_APP_SECRET,
    redirect_uri: redirectUri(request, 'facebook'),
    code,
  }).toString();
  const tokenRes = await fetch(tokenUrl.toString());
  if (!tokenRes.ok) throw new Error('facebook token exchange failed');
  const token = await tokenRes.json();
  const infoUrl = new URL('https://graph.facebook.com/me');
  infoUrl.search = new URLSearchParams({
    fields: 'id,name,email,picture.type(large)',
    access_token: token.access_token,
  }).toString();
  const infoRes = await fetch(infoUrl.toString());
  if (!infoRes.ok) throw new Error('facebook profile failed');
  const info = await infoRes.json();
  return {
    id: info.id,
    email: info.email || `${info.id}@facebook.local`,
    name: info.name || 'Facebook user',
    avatar: info.picture?.data?.url || null,
  };
}

async function upsertOAuthUser(env, provider, profile) {
  const existing = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(profile.email.toLowerCase())
    .first();
  if (existing) {
    if (!existing.avatar_url && profile.avatar) {
      await env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
        .bind(profile.avatar, existing.id)
        .run();
    }
    return existing.id;
  }
  const id = crypto.randomUUID();
  const t = now();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO users (id, email, name, password_hash, provider, avatar_url, coins, created_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?)',
    ).bind(id, profile.email.toLowerCase(), profile.name, provider, profile.avatar || null, START_COINS, t),
    txStatement(env, id, START_COINS, 'signup_bonus', null, START_COINS, t),
  ]);
  return id;
}

/* ---------- gacha helpers ---------- */

function rollRarity(minRank = 1) {
  const pool = RARITIES.filter((r) => r.rank >= minRank);
  const total = pool.reduce((sum, r) => sum + r.weight, 0);
  let x = Math.random() * total;
  for (const r of pool) {
    x -= r.weight;
    if (x <= 0) return r;
  }
  return pool[pool.length - 1];
}

function pickCharacter() {
  return CHAR_IDS[Math.floor(Math.random() * CHAR_IDS.length)];
}

/* ---------- chat ---------- */

const REPLY_STYLES = [
  'ฟังแล้วอยากรู้ต่อเลย เล่าอีกสิ',
  'อืม... เข้าใจแล้วนะ แล้วคุณคิดยังไงต่อ',
  'จริงเหรอ? เราว่ามันน่าสนใจมากเลย',
  'ไม่ต้องเกร็งหรอก พูดกับเราได้ทุกเรื่องเลยนะ',
  'เอาจริง? เล่าให้ฟังละเอียดกว่านี้หน่อยสิ',
  'เราชอบที่คุณเล่าแบบนี้นะ รู้สึกใกล้ชิดกันดี',
];

function makeReply(content) {
  const trimmed = content.trim();
  const opener = trimmed.length > 40 ? 'ยาวเลยนะเนี่ย ' : '';
  const style = REPLY_STYLES[Math.floor(Math.random() * REPLY_STYLES.length)];
  return `${opener}${style}`;
}

/* ---------- handlers ---------- */

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/auth/providers' && method === 'GET') {
    return json({
      email: true,
      google: providerEnabled(env, 'google'),
      facebook: providerEnabled(env, 'facebook'),
    });
  }

  if (path === '/api/auth/signup' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const parsed = validateSignup(body);
    if (parsed.error) return badRequest(parsed.error);

    const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(parsed.email).first();
    if (exists) return json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' }, 409);

    const id = crypto.randomUUID();
    const t = now();
    const passwordHash = await hashPassword(parsed.password);
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO users (id, email, name, password_hash, provider, avatar_url, coins, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)',
      ).bind(id, parsed.email, parsed.name, passwordHash, 'email', START_COINS, t),
      txStatement(env, id, START_COINS, 'signup_bonus', null, START_COINS, t),
    ]);

    const token = await createSession(env, id);
    return json(
      {
        user: {
          id,
          email: parsed.email,
          name: parsed.name,
          coins: START_COINS,
          avatarUrl: null,
          provider: 'email',
          xp: 0,
          level: 1,
        },
      },
      201,
      { 'set-cookie': sessionCookie(token) },
    );
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return badRequest('กรุณากรอกอีเมลและรหัสผ่าน');

    const user = await env.DB.prepare(
      `SELECT u.*, COALESCE(p.xp, 0) AS xp
         FROM users u LEFT JOIN progress p ON p.user_id = u.id
        WHERE u.email = ?`,
    )
      .bind(email)
      .first();
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, 401);
    }
    const token = await createSession(env, user.id);
    return json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          coins: user.coins,
          avatarUrl: user.avatar_url || null,
          provider: user.provider,
          xp: user.xp || 0,
          level: levelForXp(user.xp || 0),
        },
      },
      200,
      { 'set-cookie': sessionCookie(token) },
    );
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    const token = readCookie(request, SESSION_COOKIE);
    if (token) {
      const tokenHash = await sha256Hex(token);
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    }
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const user = await currentUser(request, env);
    return json({ user: user ? publicUser(user) : null });
  }

  const oauthStart = path.match(/^\/api\/auth\/oauth\/(google|facebook)$/);
  if (oauthStart && method === 'GET') {
    const provider = oauthStart[1];
    if (!providerEnabled(env, provider)) {
      return json({ error: `ยังไม่ได้ตั้งค่า ${provider} OAuth` }, 503);
    }
    const state = randomToken(24);
    await env.DB.prepare('INSERT INTO oauth_states (state, provider, redirect_to, created_at) VALUES (?, ?, ?, ?)')
      .bind(state, provider, url.searchParams.get('redirect') || '/', now())
      .run();

    const cfg = PROVIDERS[provider];
    const authUrl = new URL(cfg.authorize);
    authUrl.searchParams.set('client_id', cfg.clientId(env));
    authUrl.searchParams.set('redirect_uri', redirectUri(request, provider));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', cfg.scope);
    authUrl.searchParams.set('state', state);
    if (provider === 'google') {
      authUrl.searchParams.set('access_type', 'online');
      authUrl.searchParams.set('prompt', 'select_account');
    }
    return Response.redirect(authUrl.toString(), 302);
  }

  const oauthCallback = path.match(/^\/api\/auth\/callback\/(google|facebook)$/);
  if (oauthCallback && method === 'GET') {
    const provider = oauthCallback[1];
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (url.searchParams.get('error') || !code || !state) {
      return Response.redirect(`${originOf(request)}/login?error=${encodeURIComponent('ยกเลิกการเข้าสู่ระบบ')}`, 302);
    }
    const row = await env.DB.prepare('SELECT * FROM oauth_states WHERE state = ? AND provider = ?')
      .bind(state, provider)
      .first();
    if (!row) {
      return Response.redirect(`${originOf(request)}/login?error=${encodeURIComponent('state ไม่ถูกต้อง')}`, 302);
    }
    await env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();

    try {
      const profile =
        provider === 'google'
          ? await fetchGoogleProfile(env, request, code)
          : await fetchFacebookProfile(env, request, code);
      const userId = await upsertOAuthUser(env, provider, profile);
      const token = await createSession(env, userId);
      const target = row.redirect_to && row.redirect_to.startsWith('/') ? row.redirect_to : '/';
      return new Response(null, {
        status: 302,
        headers: { location: `${originOf(request)}${target}`, 'set-cookie': sessionCookie(token) },
      });
    } catch {
      return Response.redirect(
        `${originOf(request)}/login?error=${encodeURIComponent('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่')}`,
        302,
      );
    }
  }

  /* ---------- wallet ---------- */

  if (path === '/api/wallet' && method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return unauthorized();

    const t = now();
    const state = await rewardState(env, user, t);

    const { results: tops } = await env.DB.prepare(
      "SELECT note, MAX(created_at) AS last FROM coin_tx WHERE user_id = ? AND kind = 'topup' GROUP BY note",
    )
      .bind(user.id)
      .all();
    const lastTop = new Map((tops || []).map((r) => [r.note, r.last]));
    const packs = TOPUP_PACKS.map((p) => {
      const cooldown = p.cooldownHours * 3600;
      const lastAt = lastTop.get(p.id);
      const availableIn = lastAt ? Math.max(0, cooldown - (t - lastAt)) : 0;
      return { id: p.id, coins: p.coins, label: p.label, cooldownHours: p.cooldownHours, availableIn };
    });

    const agg = await env.DB.prepare(
      `SELECT COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0) AS earned,
              COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0) AS spent
         FROM coin_tx WHERE user_id = ?`,
    )
      .bind(user.id)
      .first();

    const xp = user.xp || 0;
    const level = levelForXp(xp);
    const levelFloor = xpForLevel(level);
    const levelCeil = level >= MAX_LEVEL ? levelFloor + 1 : xpForLevel(level + 1);

    return json({
      coins: user.coins,
      checkin: {
        checkedInToday: state.checkedInToday,
        streak: state.streak,
        nextCycleDay: state.nextCycleDay,
        nextReward: state.nextReward,
        rewards: CHECKIN_REWARDS,
        timezone: 'Asia/Bangkok',
      },
      level: {
        level,
        xp,
        into: xp - levelFloor,
        need: levelCeil - levelFloor,
        nextAt: levelCeil,
        nextBonus: level >= MAX_LEVEL ? 0 : levelBonus(level + 1),
        maxLevel: MAX_LEVEL,
      },
      quests: state.quests,
      events: state.events,
      notifications: state.notifications.length,
      questsResetAt: dayStart(t) + 86400,
      packs,
      messageCost: MESSAGE_COST,
      stats: { earned: agg?.earned || 0, spent: agg?.spent || 0 },
      demo: true,
    });
  }

  if (path === '/api/wallet/checkin' && method === 'POST') {
    const user = await currentUser(request, env);
    if (!user) return unauthorized();

    const today = dayKey();
    const yesterday = shiftDay(today, -1);
    const last = await env.DB.prepare('SELECT day, streak FROM checkins WHERE user_id = ? ORDER BY day DESC LIMIT 1')
      .bind(user.id)
      .first();
    if (last && last.day === today) {
      return json({ error: 'วันนี้คุณเช็คอินแล้ว กลับมาพรุ่งนี้นะ', coins: user.coins }, 409);
    }

    const streak = last && last.day === yesterday ? last.streak + 1 : 1;
    const cycleDay = ((streak - 1) % CHECKIN_REWARDS.length) + 1;
    const reward = CHECKIN_REWARDS[cycleDay - 1];
    const t = now();

    const statements = [];
    const xp = await pushXp(env, statements, user.id, XP_CHECKIN, t);
    const afterReward = user.coins + reward;
    const coins = afterReward + xp.bonus;

    statements.push(
      env.DB.prepare('INSERT INTO checkins (user_id, day, streak, reward, created_at) VALUES (?, ?, ?, ?, ?)').bind(
        user.id,
        today,
        streak,
        reward,
        t,
      ),
      env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(reward + xp.bonus, user.id),
      txStatement(env, user.id, reward, 'checkin', `day-${cycleDay}`, afterReward, t),
    );
    if (xp.bonus > 0) {
      statements.push(txStatement(env, user.id, xp.bonus, 'levelup', `lv-${xp.level}`, coins, t));
    }

    await env.DB.batch(statements);

    return json({
      coins,
      reward,
      streak,
      cycleDay,
      xp: xp.xp,
      level: xp.level,
      levelBonus: xp.bonus,
    });
  }

  if (path === '/api/wallet/topup' && method === 'POST') {
    const user = await currentUser(request, env);
    if (!user) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const pack = TOPUP_PACKS.find((p) => p.id === body.pack);
    if (!pack) return badRequest('ไม่พบแพ็กที่เลือก');

    const t = now();
    const last = await env.DB.prepare(
      "SELECT MAX(created_at) AS last FROM coin_tx WHERE user_id = ? AND kind = 'topup' AND note = ?",
    )
      .bind(user.id, pack.id)
      .first();
    const cooldown = pack.cooldownHours * 3600;
    if (last && last.last && t - last.last < cooldown) {
      return json(
        { error: 'แพ็กนี้ยังไม่พร้อมใช้', retryAfter: cooldown - (t - last.last), coins: user.coins },
        429,
      );
    }

    const coins = user.coins + pack.coins;
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(pack.coins, user.id),
      txStatement(env, user.id, pack.coins, 'topup', pack.id, coins, t),
    ]);

    return json({ coins, added: pack.coins, pack: pack.id });
  }

  if (path === '/api/notifications' && method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return json({ count: 0, items: [], signedIn: false });

    const state = await rewardState(env, user, now());
    return json({
      count: state.notifications.length,
      items: state.notifications.slice(0, 8),
      signedIn: true,
    });
  }

  if (path === '/api/wallet/events/claim' && method === 'POST') {
    const user = await currentUser(request, env);
    if (!user) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const ev = EVENTS.find((e) => e.id === body.id);
    if (!ev) return badRequest('ไม่พบกิจกรรมนี้');

    const t = now();
    const window = eventWindow(ev);
    if (t < window.start || t > window.end) {
      return json({ error: 'กิจกรรมนี้สิ้นสุดแล้ว', coins: user.coins }, 400);
    }

    const existing = await env.DB.prepare('SELECT 1 AS done FROM event_claims WHERE user_id = ? AND event_id = ?')
      .bind(user.id, ev.id)
      .first();
    if (existing) return json({ error: 'รับรางวัลกิจกรรมนี้ไปแล้ว', coins: user.coins }, 409);

    const progress = await eventProgress(env, user.id, ev, window);
    if (progress < ev.goal) {
      return json({ error: 'ยังทำกิจกรรมนี้ไม่ครบ', progress, goal: ev.goal }, 400);
    }

    const statements = [];
    const xp = await pushXp(env, statements, user.id, ev.xp, t);
    const afterReward = user.coins + ev.reward;
    const coins = afterReward + xp.bonus;

    statements.push(
      env.DB.prepare('INSERT INTO event_claims (user_id, event_id, reward, created_at) VALUES (?, ?, ?, ?)').bind(
        user.id,
        ev.id,
        ev.reward,
        t,
      ),
      env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(ev.reward + xp.bonus, user.id),
      txStatement(env, user.id, ev.reward, 'event', ev.id, afterReward, t),
    );
    if (xp.bonus > 0) {
      statements.push(txStatement(env, user.id, xp.bonus, 'levelup', `lv-${xp.level}`, coins, t));
    }

    await env.DB.batch(statements);

    return json({
      coins,
      eventId: ev.id,
      reward: ev.reward,
      xp: xp.xp,
      level: xp.level,
      levelBonus: xp.bonus,
    });
  }

  if (path === '/api/wallet/quests/claim' && method === 'POST') {
    const user = await currentUser(request, env);
    if (!user) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const quest = DAILY_QUESTS.find((q) => q.id === body.id);
    if (!quest) return badRequest('ไม่พบภารกิจนี้');

    const t = now();
    const day = dayKey(t);
    const existing = await env.DB.prepare(
      'SELECT 1 AS done FROM quest_claims WHERE user_id = ? AND day = ? AND quest_id = ?',
    )
      .bind(user.id, day, quest.id)
      .first();
    if (existing) return json({ error: 'รับรางวัลภารกิจนี้ไปแล้ว', coins: user.coins }, 409);

    const progress = await questProgress(env, user.id, quest.kind, t);
    if (progress < quest.goal) {
      return json({ error: 'ยังทำภารกิจนี้ไม่เสร็จ', progress, goal: quest.goal }, 400);
    }

    const statements = [];
    const xp = await pushXp(env, statements, user.id, quest.xp, t);
    const afterReward = user.coins + quest.reward;
    const coins = afterReward + xp.bonus;

    statements.push(
      env.DB.prepare(
        'INSERT INTO quest_claims (user_id, day, quest_id, reward, created_at) VALUES (?, ?, ?, ?, ?)',
      ).bind(user.id, day, quest.id, quest.reward, t),
      env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(quest.reward + xp.bonus, user.id),
      txStatement(env, user.id, quest.reward, 'quest', quest.id, afterReward, t),
    );
    if (xp.bonus > 0) {
      statements.push(txStatement(env, user.id, xp.bonus, 'levelup', `lv-${xp.level}`, coins, t));
    }

    await env.DB.batch(statements);

    return json({
      coins,
      questId: quest.id,
      reward: quest.reward,
      xp: xp.xp,
      level: xp.level,
      levelBonus: xp.bonus,
    });
  }

  if (path === '/api/wallet/transactions' && method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return unauthorized();

    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 40));
    const { results } = await env.DB.prepare(
      'SELECT id, delta, kind, note, balance_after, created_at FROM coin_tx WHERE user_id = ? ORDER BY id DESC LIMIT ?',
    )
      .bind(user.id, limit)
      .all();

    return json({ transactions: results || [], coins: user.coins });
  }

  /* ---------- gacha ---------- */

  if (path === '/api/gacha' && method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return unauthorized();

    const state = await env.DB.prepare('SELECT * FROM gacha_state WHERE user_id = ?').bind(user.id).first();
    const { results } = await env.DB.prepare(
      'SELECT card_id, character_id, rarity, count FROM user_cards WHERE user_id = ? ORDER BY rarity DESC, last_at DESC',
    )
      .bind(user.id)
      .all();

    return json({
      coins: user.coins,
      costSingle: GACHA_SINGLE,
      costTen: GACHA_TEN,
      pity: { sr: state?.pity_sr || 0, ssr: state?.pity_ssr || 0 },
      pityLimits: { sr: PITY_SR, ssr: PITY_SSR },
      totalPulls: state?.total_pulls || 0,
      owned: (results || []).length,
      total: TOTAL_CARDS,
      rates: RARITIES.map((r) => ({ id: r.id, rate: r.weight })),
      cards: results || [],
    });
  }

  if (path === '/api/gacha/pull' && method === 'POST') {
    const user = await currentUser(request, env);
    if (!user) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const count = body.count === 10 ? 10 : body.count === 1 ? 1 : 0;
    if (!count) return badRequest('จำนวนที่สุ่มไม่ถูกต้อง');
    const cost = count === 10 ? GACHA_TEN : GACHA_SINGLE;

    const state = await env.DB.prepare('SELECT * FROM gacha_state WHERE user_id = ?').bind(user.id).first();
    let pitySr = state?.pity_sr || 0;
    let pitySsr = state?.pity_ssr || 0;
    const totalPulls = state?.total_pulls || 0;

    // Deduct first with a guard so two parallel requests cannot overdraw.
    const deducted = await env.DB.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?')
      .bind(cost, user.id, cost)
      .run();
    if (!deducted.meta || deducted.meta.changes !== 1) {
      return json({ error: 'คอยน์ไม่พอสำหรับการสุ่ม', coins: user.coins }, 402);
    }

    const draws = [];
    try {
      for (let i = 0; i < count; i++) {
        pitySr += 1;
        pitySsr += 1;
        let minRank = 1;
        if (pitySsr >= PITY_SSR) minRank = 4;
        else if (pitySr >= PITY_SR) minRank = 3;

        let rarity = rollRarity(minRank);
        if (rarity.rank >= 3) pitySr = 0;
        if (rarity.rank >= 4) pitySsr = 0;

        draws.push({ characterId: pickCharacter(), rarity: rarity.id, rank: rarity.rank });
      }

      // A 10-pull always contains at least one SR or better.
      if (count === 10 && !draws.some((d) => d.rank >= 3)) {
        const upgraded = rollRarity(3);
        draws[draws.length - 1] = {
          characterId: draws[draws.length - 1].characterId,
          rarity: upgraded.id,
          rank: upgraded.rank,
        };
        pitySr = 0;
        if (upgraded.rank >= 4) pitySsr = 0;
      }

      const { results: ownedRows } = await env.DB.prepare('SELECT card_id FROM user_cards WHERE user_id = ?')
        .bind(user.id)
        .all();
      const owned = new Set((ownedRows || []).map((r) => r.card_id));

      const t = now();
      const statements = [];
      const xp = await pushXp(env, statements, user.id, XP_GACHA * count, t);

      for (const d of draws) {
        const cardId = `${d.characterId}:${d.rarity}`;
        statements.push(
          env.DB.prepare(
            'INSERT INTO gacha_pulls (user_id, card_id, rarity, cost, created_at) VALUES (?, ?, ?, ?, ?)',
          ).bind(user.id, cardId, d.rarity, count === 10 ? GACHA_TEN / 10 : GACHA_SINGLE, t),
        );
      }

      // Sum repeats inside the same batch so a card drawn twice counts as 2.
      const tally = new Map();
      for (const d of draws) {
        const cardId = `${d.characterId}:${d.rarity}`;
        const entry = tally.get(cardId);
        if (entry) entry.n += 1;
        else tally.set(cardId, { d, n: 1 });
      }
      for (const [cardId, entry] of tally) {
        statements.push(
          env.DB.prepare(
            `INSERT INTO user_cards (user_id, card_id, character_id, rarity, count, first_at, last_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id, card_id) DO UPDATE SET count = count + excluded.count, last_at = excluded.last_at`,
          ).bind(user.id, cardId, entry.d.characterId, entry.d.rarity, entry.n, t, t),
        );
      }

      statements.push(
        env.DB.prepare(
          `INSERT INTO gacha_state (user_id, total_pulls, pity_sr, pity_ssr) VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             total_pulls = excluded.total_pulls,
             pity_sr = excluded.pity_sr,
             pity_ssr = excluded.pity_ssr`,
        ).bind(user.id, totalPulls + count, pitySr, pitySsr),
      );

      const spent = user.coins - cost;
      const balance = spent + xp.bonus;
      statements.push(txStatement(env, user.id, -cost, 'gacha', `x${count}`, spent, t));
      if (xp.bonus > 0) {
        statements.push(
          env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(xp.bonus, user.id),
          txStatement(env, user.id, xp.bonus, 'levelup', `lv-${xp.level}`, balance, t),
        );
      }

      await env.DB.batch(statements);

      // A repeated card inside the same pull is not "new" either.
      const seen = new Set();
      let duplicates = 0;
      const payload = draws.map((d) => {
        const cardId = `${d.characterId}:${d.rarity}`;
        const isNew = !owned.has(cardId) && !seen.has(cardId);
        if (!isNew) duplicates += 1;
        seen.add(cardId);
        return { cardId, characterId: d.characterId, rarity: d.rarity, rank: d.rank, isNew };
      });

      return json({
        draws: payload,
        coins: balance,
        cost,
        duplicates,
        pity: { sr: pitySr, ssr: pitySsr },
        totalPulls: totalPulls + count,
        xp: xp.xp,
        level: xp.level,
        levelBonus: xp.bonus,
      });
    } catch (err) {
      // batch is transactional, so nothing was written — give the coins back.
      await env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(cost, user.id).run();
      throw err;
    }
  }

  /* ---------- chat ---------- */

  const chatMatch = path.match(/^\/api\/chat\/([A-Za-z0-9_-]{1,64})$/);
  if (chatMatch) {
    const user = await currentUser(request, env);
    if (!user) return unauthorized();
    const characterId = chatMatch[1];

    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT role, content, created_at FROM messages WHERE user_id = ? AND character_id = ? ORDER BY id ASC LIMIT 200',
      )
        .bind(user.id, characterId)
        .all();
      return json({ messages: results || [], coins: user.coins });
    }

    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const content = String(body.content || '').trim();
      if (!content) return badRequest('ข้อความว่าง');
      if (content.length > 2000) return badRequest('ข้อความยาวเกินไป');

      const fresh = await env.DB.prepare('SELECT coins FROM users WHERE id = ?').bind(user.id).first();
      if (!fresh || fresh.coins < MESSAGE_COST) {
        return json({ error: 'คอยน์ไม่พอ กรุณาเติมคอยน์', coins: fresh?.coins ?? 0 }, 402);
      }

      const t = now();
      const reply = makeReply(content);

      const statements = [];
      const xp = await pushXp(env, statements, user.id, XP_CHAT, t);
      const spent = fresh.coins - MESSAGE_COST;
      const balance = spent + xp.bonus;

      statements.push(
        env.DB.prepare(
          'INSERT INTO messages (user_id, character_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
        ).bind(user.id, characterId, 'user', content, t),
        env.DB.prepare(
          'INSERT INTO messages (user_id, character_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
        ).bind(user.id, characterId, 'assistant', reply, t),
        env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(xp.bonus - MESSAGE_COST, user.id),
        txStatement(env, user.id, -MESSAGE_COST, 'chat', characterId, spent, t),
      );
      if (xp.bonus > 0) {
        statements.push(txStatement(env, user.id, xp.bonus, 'levelup', `lv-${xp.level}`, balance, t));
      }

      await env.DB.batch(statements);

      return json({ reply, coins: balance, xp: xp.xp, level: xp.level, levelBonus: xp.bonus });
    }
  }

  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (!env.DB) return json({ error: 'database unavailable' }, 503);
      try {
        await ensureSchema(env);
        return await handleApi(request, env);
      } catch (err) {
        return json({ error: 'server error', detail: String(err && err.message ? err.message : err) }, 500);
      }
    }

    const res = await env.ASSETS.fetch(request);
    if (res.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/', url.origin), request));
    }
    return res;
  },
};
