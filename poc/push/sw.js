// Future Alert - Phase 0 Web Push PoC service worker.
// Served from the site root (/sw.js) so its scope is "/".
'use strict';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Resolve a click target and refuse anything that is not same-origin.
function resolveTarget(rawUrl) {
  try {
    const url = new URL(rawUrl || '/', self.location.origin);
    if (url.origin === self.location.origin) return url.href;
  } catch {
    // fall through
  }
  return new URL('/', self.location.origin).href;
}

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Future Alert';
  const options = {
    body: data.body || '',
    icon: '/apple-touch-icon.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/', sentAt: data.sentAt || null },
  };
  if (data.tag) options.tag = data.tag;

  // Always show a notification: subscriptions are created with userVisibleOnly: true,
  // and a push that shows nothing may cause the browser to revoke the subscription.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = resolveTarget(event.notification.data && event.notification.data.url);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Reuse an existing Future Alert page if there is one.
      const existing = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        const focused = await existing.focus();
        const client = focused || existing;
        if (client.url === target) return;
        // navigate() only works for controlled clients; fall back to a message the page handles.
        if ('navigate' in client) {
          try {
            await client.navigate(target);
            return;
          } catch {
            // fall through to postMessage
          }
        }
        client.postMessage({ type: 'notification-click', url: target });
        return;
      }
      // Otherwise open the target URL.
      await self.clients.openWindow(target);
    })()
  );
});

// Best effort: if the browser rotates the subscription, re-register it with the server.
// MDN compat data lists this event as unsupported on iOS Safari (see docs/TECH_VALIDATION.md).
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch('/vapid-public-key');
      const { publicKey } = await res.json();
      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      await fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
    })()
  );
});
