// Future Alert - Phase 0 Web Push PoC server.
// PoC only: not production code. No external data APIs are called here.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const webpush = require('web-push');

const PORT = Number(process.env.PORT) || 3000;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const SUBSCRIPTIONS_FILE =
  process.env.SUBSCRIPTIONS_FILE || path.join(__dirname, 'subscriptions.json');

// /send-delayed is for short tests only (spec: 5-10 min). Never use it for hours-later tests.
const DELAY_MIN_SEC = 60;
const DELAY_MAX_SEC = 600;
const DELAY_DEFAULT_SEC = 300;
// /subscribe is unauthenticated, so cap how many subscriptions a PoC instance keeps.
const MAX_SUBSCRIPTIONS = 50;

const log = (...args) => console.log(new Date().toISOString(), ...args);

// ---------- VAPID ----------
const vapidReady = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
if (vapidReady) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  log('[warn] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT are not all set. Push sending is disabled.');
}
if (!ADMIN_TOKEN) {
  log('[warn] ADMIN_TOKEN is not set. /send-test and /send-delayed will always return 401.');
}

// ---------- subscriptions.json ----------
function ensureStore() {
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, '[]\n');
    log(`[store] created ${SUBSCRIPTIONS_FILE}`);
  }
}

function loadSubscriptions() {
  try {
    const data = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    log(`[store] could not read ${SUBSCRIPTIONS_FILE}, treating as empty: ${err.message}`);
    return [];
  }
}

function saveSubscriptions(list) {
  const tmp = `${SUBSCRIPTIONS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2) + '\n');
  fs.renameSync(tmp, SUBSCRIPTIONS_FILE);
}

function isValidSubscription(sub) {
  return Boolean(
    sub &&
      typeof sub.endpoint === 'string' &&
      sub.endpoint.startsWith('https://') &&
      sub.keys &&
      typeof sub.keys.p256dh === 'string' &&
      typeof sub.keys.auth === 'string'
  );
}

// Log only the push service host + a short hash, never the full endpoint.
function describeEndpoint(endpoint) {
  const hash = crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 10);
  try {
    return `${new URL(endpoint).host}#${hash}`;
  } catch {
    return `invalid#${hash}`;
  }
}

ensureStore();

// ---------- auth ----------
function tokenMatches(given) {
  if (!ADMIN_TOKEN || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  const auth = req.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
  const token = bearer ?? req.get('x-admin-token');
  if (!tokenMatches(token)) {
    log(`[auth] 401 ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// ---------- sending ----------
function buildPayload(body = {}) {
  const now = new Date().toISOString();
  // Only same-origin paths are allowed as click targets (sw.js enforces this too).
  const url = typeof body.url === 'string' && body.url.startsWith('/') && !body.url.startsWith('//')
    ? body.url
    : '/?from=push';
  return {
    title: typeof body.title === 'string' && body.title ? body.title.slice(0, 80) : 'Future Alert テスト通知',
    body: typeof body.body === 'string' && body.body ? body.body.slice(0, 200) : `サーバー送信時刻: ${now}`,
    url,
    tag: typeof body.tag === 'string' && body.tag ? body.tag.slice(0, 40) : undefined,
    sentAt: now,
  };
}

// Sends to every stored subscription (or to one explicitly given subscription)
// and deletes stored subscriptions the push service reports as gone (404/410).
async function sendToAll(payload, explicitSubscription) {
  if (!vapidReady) throw new Error('VAPID keys are not configured');

  const targets = explicitSubscription ? [explicitSubscription] : loadSubscriptions();
  const results = { total: targets.length, sent: 0, failed: 0, removed: 0, details: [] };
  const expired = new Set();

  await Promise.all(
    targets.map(async (sub) => {
      const who = describeEndpoint(sub.endpoint);
      try {
        const r = await webpush.sendNotification(sub, JSON.stringify(payload), {
          TTL: 60 * 60,
          urgency: 'high', // ask the push service to deliver immediately
        });
        results.sent += 1;
        results.details.push({ endpoint: who, statusCode: r.statusCode });
        log(`[push] sent ${who} status=${r.statusCode}`);
      } catch (err) {
        results.failed += 1;
        const statusCode = err.statusCode || null;
        results.details.push({ endpoint: who, statusCode, error: err.body || err.message });
        log(`[push] failed ${who} status=${statusCode} body=${err.body || err.message}`);
        if (statusCode === 404 || statusCode === 410) expired.add(sub.endpoint);
      }
    })
  );

  if (expired.size > 0) {
    const before = loadSubscriptions();
    const after = before.filter((s) => !expired.has(s.endpoint));
    results.removed = before.length - after.length;
    if (results.removed > 0) {
      saveSubscriptions(after);
      for (const ep of expired) log(`[store] removed expired subscription ${describeEndpoint(ep)}`);
    }
  }
  return results;
}

function readExplicitSubscription(body) {
  if (!body || body.subscription === undefined) return { ok: true, sub: undefined };
  let sub = body.subscription;
  if (typeof sub === 'string') {
    try {
      sub = JSON.parse(sub);
    } catch {
      return { ok: false };
    }
  }
  return isValidSubscription(sub) ? { ok: true, sub } : { ok: false };
}

// ---------- app ----------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// Static files are served from an explicit allowlist so that server.js,
// package.json, .env and subscriptions.json can never be downloaded.
const STATIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/app.js': 'app.js',
  '/style.css': 'style.css',
  '/manifest.json': 'manifest.json',
  '/sw.js': 'sw.js',
  '/apple-touch-icon.png': 'apple-touch-icon.png',
  '/icon-192.png': 'icon-192.png',
  '/icon-512.png': 'icon-512.png',
  '/admin': 'admin.html',
  '/admin.js': 'admin.js',
};
for (const [route, file] of Object.entries(STATIC_FILES)) {
  app.get(route, (req, res) => {
    if (file === 'sw.js') {
      // Always revalidate the service worker so PoC edits reach the device.
      res.set('Cache-Control', 'no-cache');
    }
    if (file === 'manifest.json') res.type('application/manifest+json');
    res.sendFile(path.join(__dirname, file));
  });
}

app.get('/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) return res.status(503).json({ error: 'VAPID_PUBLIC_KEY is not set' });
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// No admin auth (per spec).
app.post('/subscribe', (req, res) => {
  const sub = req.body;
  if (!isValidSubscription(sub)) return res.status(400).json({ error: 'invalid subscription' });

  const list = loadSubscriptions();
  const idx = list.findIndex((s) => s.endpoint === sub.endpoint);
  const record = { endpoint: sub.endpoint, keys: sub.keys, expirationTime: sub.expirationTime ?? null };
  if (idx >= 0) {
    list[idx] = { ...record, createdAt: list[idx].createdAt, updatedAt: new Date().toISOString() };
  } else {
    if (list.length >= MAX_SUBSCRIPTIONS) {
      return res.status(429).json({ error: `subscription limit (${MAX_SUBSCRIPTIONS}) reached` });
    }
    list.push({ ...record, createdAt: new Date().toISOString() });
  }
  saveSubscriptions(list);
  log(`[store] ${idx >= 0 ? 'updated' : 'added'} subscription ${describeEndpoint(sub.endpoint)} (count=${list.length})`);
  res.status(idx >= 0 ? 200 : 201).json({ ok: true, subscriptionCount: list.length });
});

app.post('/unsubscribe', (req, res) => {
  const endpoint = req.body && req.body.endpoint;
  if (typeof endpoint !== 'string') return res.status(400).json({ error: 'endpoint required' });
  const list = loadSubscriptions();
  const after = list.filter((s) => s.endpoint !== endpoint);
  if (after.length !== list.length) {
    saveSubscriptions(after);
    log(`[store] removed subscription by client request ${describeEndpoint(endpoint)}`);
  }
  res.json({ ok: true, subscriptionCount: after.length });
});

app.post('/send-test', requireAdmin, async (req, res) => {
  const explicit = readExplicitSubscription(req.body);
  if (!explicit.ok) return res.status(400).json({ error: 'invalid subscription in body' });
  try {
    const payload = buildPayload(req.body);
    const results = await sendToAll(payload, explicit.sub);
    res.json({ ok: true, payload, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const pendingDelayed = new Map();

app.post('/send-delayed', requireAdmin, (req, res) => {
  if (!vapidReady) return res.status(500).json({ error: 'VAPID keys are not configured' });
  const explicit = readExplicitSubscription(req.body);
  if (!explicit.ok) return res.status(400).json({ error: 'invalid subscription in body' });

  const raw = req.body && req.body.delaySeconds;
  const delaySeconds = raw === undefined ? DELAY_DEFAULT_SEC : Number(raw);
  if (!Number.isInteger(delaySeconds) || delaySeconds < DELAY_MIN_SEC || delaySeconds > DELAY_MAX_SEC) {
    return res.status(400).json({
      error: `delaySeconds must be an integer between ${DELAY_MIN_SEC} and ${DELAY_MAX_SEC} (short tests only)`,
    });
  }

  const id = crypto.randomUUID();
  const scheduledFor = new Date(Date.now() + delaySeconds * 1000).toISOString();
  const payload = buildPayload({
    ...req.body,
    body: req.body.body || `遅延通知（${delaySeconds}秒後）予定時刻: ${scheduledFor}`,
  });

  // In-memory timer: lost if the process restarts or the free instance spins down.
  const timer = setTimeout(async () => {
    pendingDelayed.delete(id);
    try {
      const results = await sendToAll({ ...payload, sentAt: new Date().toISOString() }, explicit.sub);
      log(`[delayed] ${id} fired sent=${results.sent} failed=${results.failed} removed=${results.removed}`);
    } catch (err) {
      log(`[delayed] ${id} failed: ${err.message}`);
    }
  }, delaySeconds * 1000);
  pendingDelayed.set(id, { timer, scheduledFor });
  log(`[delayed] ${id} scheduled in ${delaySeconds}s (at ${scheduledFor})`);

  res.status(202).json({ ok: true, id, delaySeconds, scheduledFor, payload });
});

// No admin auth (per spec).
app.get('/status', (req, res) => {
  res.json({
    serverStatus: 'ok',
    subscriptionCount: loadSubscriptions().length,
    vapidConfigured: vapidReady,
    adminTokenConfigured: Boolean(ADMIN_TOKEN),
    pendingDelayedCount: pendingDelayed.size,
    uptimeSeconds: Math.round(process.uptime()),
    serverTime: new Date().toISOString(),
  });
});

app.use((req, res) => res.status(404).json({ error: 'not found' }));

app.listen(PORT, () => log(`[server] listening on :${PORT}`));
