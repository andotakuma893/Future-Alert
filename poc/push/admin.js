// Future Alert - Phase 0 Web Push PoC admin page.
'use strict';

const $ = (id) => document.getElementById(id);

function show(el, status, data) {
  $(el).textContent = `HTTP ${status}\n${JSON.stringify(data, null, 2)}`;
}

function payload(extra = {}) {
  const body = {
    title: $('title').value,
    body: $('body').value,
    url: $('url').value,
    ...extra,
  };
  const sub = $('subscription').value.trim();
  if (sub) body.subscription = sub;
  return body;
}

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${$('token').value}`,
    },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

$('btn-status').addEventListener('click', async () => {
  const res = await fetch('/status');
  show('status-out', res.status, await res.json());
});

$('btn-send').addEventListener('click', async () => {
  const { status, data } = await post('/send-test', payload());
  show('send-out', status, data);
});

$('btn-delayed').addEventListener('click', async () => {
  const { status, data } = await post('/send-delayed', payload({ delaySeconds: Number($('delay').value) }));
  show('send-out', status, data);
});
