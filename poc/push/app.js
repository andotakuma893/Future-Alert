// Future Alert - Phase 0 Web Push PoC client.
// Permission is requested only from explicit button taps (never on page load).
'use strict';

const $ = (id) => document.getElementById(id);

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  $('log').textContent = `${line}\n${$('log').textContent}`;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// VAPID public key (base64url) -> Uint8Array for applicationServerKey.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function getRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.getRegistration('/');
}

async function renderEnv() {
  const reg = await getRegistration();
  const sub = reg && 'pushManager' in reg ? await reg.pushManager.getSubscription() : null;
  const rows = {
    'ホーム画面から起動': isStandalone() ? 'はい' : 'いいえ（Safariタブ）',
    'Service Worker': 'serviceWorker' in navigator ? (reg ? '登録済み' : '未登録') : '非対応',
    'Notification API': 'Notification' in window ? '対応' : '非対応',
    'PushManager': 'PushManager' in window ? '対応' : '非対応',
    '通知の許可': 'Notification' in window ? Notification.permission : '-',
    '購読': sub ? '購読中' : '未購読',
    'User Agent': navigator.userAgent,
  };
  $('env').innerHTML = Object.entries(rows)
    .map(([k, v]) => `<dt>${k}</dt><dd>${String(v).replace(/</g, '&lt;')}</dd>`)
    .join('');
  $('hint').hidden = isStandalone();
  $('sub-json').value = sub ? JSON.stringify(sub) : '';
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) {
    log('Service Worker非対応のブラウザです');
    return null;
  }
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return reg;
}

$('btn-permission').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    log('Notification API がありません。iPhoneではホーム画面から起動したPWAでのみ利用できます。');
    return;
  }
  const result = await Notification.requestPermission();
  log(`通知の許可: ${result}`);
  renderEnv();
});

$('btn-subscribe').addEventListener('click', async () => {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      log('先に「通知を許可する」で許可してください');
      return;
    }
    const reg = await registerSW();
    if (!reg || !('pushManager' in reg)) {
      log('PushManager がありません');
      return;
    }
    const keyRes = await fetch('/vapid-public-key');
    if (!keyRes.ok) throw new Error(`VAPID公開鍵の取得に失敗 (${keyRes.status})`);
    const { publicKey } = await keyRes.json();

    const sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const res = await fetch('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    const body = await res.json();
    log(`サーバーに登録: HTTP ${res.status} 件数=${body.subscriptionCount ?? '-'}`);
    log(`push service: ${new URL(sub.endpoint).host}`);
  } catch (err) {
    log(`購読エラー: ${err.name}: ${err.message}`);
  }
  renderEnv();
});

$('btn-local').addEventListener('click', async () => {
  const reg = await getRegistration();
  if (!reg || !('Notification' in window) || Notification.permission !== 'granted') {
    log('Service Worker登録と通知許可が必要です');
    return;
  }
  await reg.showNotification('Future Alert 端末内テスト', {
    body: 'サーバーを経由しない表示確認です',
    icon: '/apple-touch-icon.png',
    data: { url: '/?from=local' },
  });
  log('端末内テスト通知を表示しました');
});

$('btn-unsubscribe').addEventListener('click', async () => {
  const reg = await getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) {
    log('購読していません');
    return;
  }
  await fetch('/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  const ok = await sub.unsubscribe();
  log(`購読解除: ${ok}`);
  renderEnv();
});

$('btn-refresh').addEventListener('click', renderEnv);

$('btn-copy').addEventListener('click', async () => {
  const text = $('sub-json').value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    log('購読情報をコピーしました');
  } catch {
    $('sub-json').select();
    log('自動コピーに失敗しました。選択された内容を手動でコピーしてください');
  }
});

// sw.js falls back to postMessage when it cannot navigate an existing window.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'notification-click' && event.data.url) {
      window.location.href = event.data.url;
    }
  });
}

const params = new URLSearchParams(window.location.search);
if (params.get('from')) log(`通知タップで開かれました (from=${params.get('from')})`);

// Registering the service worker does not prompt the user, so it is safe on load.
registerSW().then(renderEnv).catch((err) => {
  log(`Service Worker登録エラー: ${err.message}`);
  renderEnv();
});
