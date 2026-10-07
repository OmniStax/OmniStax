/* OmniStax offline resolver. Installations are verified by the page before its
   active pointer is committed; this worker never treats ordinary HTTP cache
   entries as a complete book. */
const DB = 'omnistax-offline', STORE = 'installations', PINS = 'clientPins';
const pins = new Map();
const openDb = () => new Promise((resolve, reject) => { const r = indexedDB.open(DB, 2); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'bookId' }); if (!r.result.objectStoreNames.contains(PINS)) r.result.createObjectStore(PINS, { keyPath: 'clientId' }); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const records = async () => { const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE); const r = tx.objectStore(STORE).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); tx.oncomplete = () => db.close(); }); };
const normalizePins = (record) => {
  if (!record) return null;
  if (record.pins && typeof record.pins === 'object') return { clientId: record.clientId, primaryBook: record.primaryBook, pins: record.pins, snapshot: record.snapshot };
  if (record.bookId && record.release && record.artifact) return { clientId: record.clientId, primaryBook: record.bookId, pins: { [record.bookId]: { bookId: record.bookId, release: record.release, artifact: record.artifact } } };
  return null;
};
const pinRead = async (clientId) => { if (!clientId) return null; const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(PINS);const r=tx.objectStore(PINS).get(clientId);r.onsuccess=()=>resolve(normalizePins(r.result));r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close()}); };
const pinWrite = async (clientId, value) => { if (!clientId) return; const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(PINS,'readwrite');tx.objectStore(PINS).put({clientId,...value});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}}); };
const cacheName = (book, release, artifact) => `omnistax-book:${book}:${release}:${artifact}`;
const artifactFor = (record, release) => release === record.installedRelease
  ? (record.installedArtifact || record.manifest?.runtime?.artifactId)
  : release === record.previousRelease
    ? (record.previousArtifact || record.previousManifest?.runtime?.artifactId)
    : null;
const bookOf = (pathname, installs) => { const first = pathname.split('/').filter(Boolean)[0]; return installs.find((record) => record.bookId === first); };
const pinsFor = async (clientId) => {
  const held = pins.get(clientId); if (held) return held;
  const persisted = await pinRead(clientId).catch(() => null); if (persisted) { pins.set(clientId,persisted); return persisted; }
  return { clientId, primaryBook: undefined, pins: {} };
};
const pinnedFor = async (event, installs, pathname) => {
  const held = await pinsFor(event.clientId);
  const requested = bookOf(pathname, installs);
  if (requested?.installedRelease) {
    if (held.pins[requested.bookId]) return [held.pins[requested.bookId]];
    const artifact = artifactFor(requested, requested.installedRelease); if (!artifact) return [];
    const pin = { bookId: requested.bookId, release: requested.installedRelease, artifact };
    const next = { ...held, pins: { ...held.pins, [requested.bookId]: pin } }; pins.set(event.clientId, next); await pinWrite(event.clientId, next).catch(() => undefined); return [pin];
  }
  const others = (primary) => Object.values(held.pins).filter((pin) => pin.bookId !== primary);
  if (held.primaryBook && held.pins[held.primaryBook]) return [held.pins[held.primaryBook], ...others(held.primaryBook)];
  const client = event.clientId ? await clients.get(event.clientId) : null;
  const found = client ? bookOf(new URL(client.url).pathname, installs) : null;
  const artifact = found?.installedRelease ? artifactFor(found, found.installedRelease) : null;
  if (!artifact) return others(undefined);
  const pin = { bookId: found.bookId, release: found.installedRelease, artifact };
  const next = { ...held, primaryBook: found.bookId, pins: { ...held.pins, [found.bookId]: pin } }; pins.set(event.clientId, next); await pinWrite(event.clientId, next).catch(() => undefined);
  return [pin, ...others(found.bookId)];
};
const logicalOf = (pathname) => pathname.endsWith('/') ? `${pathname}index.html` : !pathname.split('/').pop().includes('.') ? `${pathname}/index.html` : pathname;
const cached = async (pin, request, installs) => {
  const cache = await caches.open(cacheName(pin.bookId, pin.release, pin.artifact));
  const pathname = new URL(request.url).pathname;
  const logical = logicalOf(pathname);
  const response = await cache.match(pathname) ?? await cache.match(logical); if (response) return response;
  const record = installs.find((item) => item.bookId === pin.bookId);
  const manifest = record && pin.release === record.installedRelease ? record.manifest : record && pin.release === record.previousRelease ? record.previousManifest : null;
  return manifest?.resources?.some((resource) => resource.logicalUrl === pathname || resource.logicalUrl === logical)
    ? new Response('Installed offline resource is missing. Repair this download.', { status: 503 }) : null;
};
/* A path without a book prefix (/media, /assets, /about.html) may sit in any
   book the client holds; a miss in one is only final when no other has it. */
const fromPins = async (held, request, installs) => {
  let miss = null;
  for (const pin of held) {
    const response = await cached(pin, request, installs);
    if (response?.ok) return response;
    miss ??= response;
  }
  return miss;
};
/* A downloaded book carries one page, its own front, and the shell on it opens
   whichever section the address names. Offline, the front of OmniStax is the
   front of a downloaded book: its own page needs the first library book's data. */
const shellOf = async (pin) => (await caches.open(cacheName(pin.bookId, pin.release, pin.artifact))).match(`/${pin.bookId}/index.html`);
/* The app opens offline with no book downloaded. The build lists its shell in
   /offline-shell.json; the worker keeps one complete copy, and a copy is
   complete once the list itself is in it, after every verified file. A newer
   list is fetched on every navigation the network answers, and once its copy
   is complete the older one goes. */
const SHELL = 'omnistax-shell:', SHELL_LIST = '/offline-shell.json';
const hex = async (body) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', body))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const shellCache = async () => {
  for (const name of await caches.keys()) {
    if (!name.startsWith(SHELL)) continue;
    const cache = await caches.open(name); if (await cache.match(SHELL_LIST)) return cache;
  }
  return null;
};
const saveShell = async () => {
  const listed = await fetch(SHELL_LIST, { cache: 'no-store' }); if (!listed.ok) return;
  const { shellId, resources } = await listed.clone().json(); const name = SHELL + shellId;
  const cache = await caches.open(name);
  if (!await cache.match(SHELL_LIST)) {
    await Promise.all(resources.map(async ({ url, sha256, bytes }) => {
      if (await cache.match(url)) return;
      const response = await fetch(url, { cache: 'no-cache' }); const body = await response.arrayBuffer();
      if (!response.ok || body.byteLength !== bytes || await hex(body) !== sha256) throw new Error(`${url} does not match the shell list.`);
      await cache.put(url, new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers }));
    }));
    await cache.put(SHELL_LIST, listed);
  }
  for (const key of await caches.keys()) if (key.startsWith(SHELL) && key !== name) await caches.delete(key);
};
let saving = null;
const refreshShell = () => saving ??= saveShell().catch(() => undefined).finally(() => { saving = null; });
/* A page of a book that is not downloaded opens on the book's front, whose shell reads the address. */
const fromShell = async (pathname, navigate) => {
  const shell = await shellCache(); if (!shell) return null;
  const book = pathname.split('/').filter(Boolean)[0];
  return await shell.match(pathname) ?? await shell.match(logicalOf(pathname)) ?? (navigate && book ? await shell.match(`/${book}/index.html`) : undefined) ?? null;
};
const offlinePage = () => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OmniStax offline</title><style>body{font:16px system-ui;max-width:42rem;margin:12vh auto;padding:1rem}a{color:#1d4ed8}</style><h1>This page is not downloaded</h1><p>Open an available offline textbook from the <a href="/">OmniStax library</a>, or reconnect to download it.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

self.addEventListener('install', (event) => { /* Activation waits naturally; no skipWaiting. */ event.waitUntil(refreshShell()); });
self.addEventListener('activate', () => { /* Existing clients choose a snapshot on their next full navigation. */ });
self.addEventListener('message', (event) => {
  const reply = event.ports?.[0]; if (!reply || !event.source?.id) return;
  event.waitUntil((async () => {
    if (event.data?.type === 'omnistax:current-pin') {
      const value = await pinsFor(event.source.id); const pin = value.primaryBook ? value.pins[value.primaryBook] : null; reply.postMessage(pin ? { ...pin, snapshot: value.snapshot } : null); return;
    }
    if (event.data?.type === 'omnistax:live-pins') {
      const live = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const ids = new Set(live.map((client) => client.id));
      const values = (await Promise.all([...ids].map(async (id) => await pinsFor(id)))).flatMap((value) => Object.values(value.pins));
      for (const id of [...pins.keys()]) if (!ids.has(id)) pins.delete(id);
      reply.postMessage(values); return;
    }
  })());
});
/* The live site answers whenever it can. A snapshot stands in when the network
   fails, or when a page is slow and the snapshot holds it. A file of a live page
   is not cut off for being slow: the snapshot's copy may be another build's. */
const SLOW_MS = 3000;
const liveFirst = async (request, snapshot, slowMs) => {
  const live = fetch(request).catch(() => null);
  const first = slowMs ? await Promise.race([live, new Promise((resolve) => setTimeout(resolve, slowMs))]) : await live;
  if (first) return first;
  const standIn = await snapshot();
  return standIn?.ok || first === null ? standIn : await live ?? standIn;
};
/* snapshot: 'chosen' when the reader asked for a release, 'fallback' when the
   network failed; either way the page and its files come from one snapshot. */
const remember = async (clientId, pin, snapshot) => {
  const held = await pinsFor(clientId); const next = { ...held, primaryBook: pin.bookId, pins: { ...held.pins, [pin.bookId]: pin }, snapshot };
  pins.set(clientId, next); await pinWrite(clientId, next).catch(() => undefined);
};
const navigation = async (event, url) => {
  const installs = (await records().catch(() => [])).filter((record) => record.installedRelease);
  const record = bookOf(url.pathname, installs);
  const requested = url.searchParams.get('_omnistax_release');
  const chosen = !!record && !!requested && (requested === record.installedRelease || requested === record.previousRelease);
  const release = chosen ? requested : record?.installedRelease;
  const artifact = record && artifactFor(record, release);
  const own = artifact ? { bookId: record.bookId, release, artifact } : null;
  const roots = url.pathname === '/' || url.pathname === '/index.html'
    ? installs.map((item) => ({ bookId: item.bookId, release: item.installedRelease, artifact: artifactFor(item, item.installedRelease) })).filter((pin) => pin.artifact) : [];
  let pin = own, snapshot;
  const fromSnapshot = async () => {
    let miss = null;
    for (const candidate of own ? [own] : roots) {
      const response = (own && await cached(candidate, event.request, installs)) ?? await shellOf(candidate);
      if (response?.ok) { pin = candidate; snapshot = chosen ? 'chosen' : 'fallback'; return response; }
      miss ??= response;
    }
    return miss;
  };
  const response = (chosen && await fromSnapshot()) || await liveFirst(event.request, fromSnapshot, SLOW_MS);
  if (pin && event.resultingClientId) await remember(event.resultingClientId, pin, snapshot);
  if (!pin && response?.ok) event.waitUntil(refreshShell());
  return response ?? await fromShell(url.pathname, true) ?? offlinePage();
};
const resource = async (event, url) => {
  /* A failed inspection still has an active installed snapshot. Keep routing
     through it so an evicted file becomes an explicit repair error instead
     of mixing a network response into the pinned release. */
  const fromSnapshot = async () => { const installs = (await records().catch(() => [])).filter((record) => record.installedRelease); return fromPins(await pinnedFor(event, installs, url.pathname), event.request, installs); };
  const response = (await pinsFor(event.clientId)).snapshot ? await fromSnapshot() ?? await fetch(event.request).catch(() => null) : await liveFirst(event.request, fromSnapshot);
  /* A file the network cannot give, or no longer has, comes from the shell: a page the shell answered asks for its own build's files. */
  if (response && response.status !== 404) return response;
  return await fromShell(url.pathname, false) ?? response ?? new Response('Offline resource unavailable', { status: 503 });
};
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url); if (url.origin !== location.origin) return;
  if (url.pathname === '/offline-catalog.json') { event.respondWith(fetch(event.request, { cache: 'no-store' })); return; }
  event.respondWith(event.request.mode === 'navigate' ? navigation(event, url) : resource(event, url));
});
