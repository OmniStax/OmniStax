/* OmniStax offline resolver. Installations are verified by the page before its
   active pointer is committed; this worker never treats ordinary HTTP cache
   entries as a complete book. */
const DB = 'omnistax-offline', STORE = 'installations', PINS = 'clientPins';
const pins = new Map();
const openDb = () => new Promise((resolve, reject) => { const r = indexedDB.open(DB, 2); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'bookId' }); if (!r.result.objectStoreNames.contains(PINS)) r.result.createObjectStore(PINS, { keyPath: 'clientId' }); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const records = async () => { const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE); const r = tx.objectStore(STORE).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); tx.oncomplete = () => db.close(); }); };
const normalizePins = (record) => {
  if (!record) return null;
  if (record.pins && typeof record.pins === 'object') return { clientId: record.clientId, primaryBook: record.primaryBook, pins: record.pins };
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
    if (held.pins[requested.bookId]) return held.pins[requested.bookId];
    const artifact = artifactFor(requested, requested.installedRelease); if (!artifact) return null;
    const pin = { bookId: requested.bookId, release: requested.installedRelease, artifact };
    const next = { ...held, pins: { ...held.pins, [requested.bookId]: pin } }; pins.set(event.clientId, next); await pinWrite(event.clientId, next).catch(() => undefined); return pin;
  }
  if (held.primaryBook && held.pins[held.primaryBook]) return held.pins[held.primaryBook];
  const client = event.clientId ? await clients.get(event.clientId) : null;
  const found = client ? bookOf(new URL(client.url).pathname, installs) : null;
  if (!found?.installedRelease) return null;
  const artifact = artifactFor(found, found.installedRelease); if (!artifact) return null;
  const pin = { bookId: found.bookId, release: found.installedRelease, artifact };
  const next = { ...held, primaryBook: found.bookId, pins: { ...held.pins, [found.bookId]: pin } }; pins.set(event.clientId, next); await pinWrite(event.clientId, next).catch(() => undefined); return pin;
};
const cached = async (pin, request, installs) => {
  const cache = await caches.open(cacheName(pin.bookId, pin.release, pin.artifact));
  const pathname = new URL(request.url).pathname;
  const logical = pathname.endsWith('/') ? `${pathname}index.html` : !pathname.split('/').pop().includes('.') ? `${pathname}/index.html` : pathname;
  const response = await cache.match(pathname) ?? await cache.match(logical); if (response) return response;
  const record = installs.find((item) => item.bookId === pin.bookId);
  const manifest = record && pin.release === record.installedRelease ? record.manifest : record && pin.release === record.previousRelease ? record.previousManifest : null;
  return manifest?.resources?.some((resource) => resource.logicalUrl === pathname || resource.logicalUrl === logical)
    ? new Response('Installed offline resource is missing. Repair this download.', { status: 503 }) : null;
};
/* A downloaded book carries one page, its own front, and the shell on it opens
   whichever section the address names. */
const shellOf = async (pin) => (await caches.open(cacheName(pin.bookId, pin.release, pin.artifact))).match(`/${pin.bookId}/index.html`);
const offlinePage = () => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OmniStax offline</title><style>body{font:16px system-ui;max-width:42rem;margin:12vh auto;padding:1rem}a{color:#1d4ed8}</style><h1>This page is not downloaded</h1><p>Open an available offline textbook from the <a href="/">OmniStax library</a>, or reconnect to download it.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

self.addEventListener('install', () => { /* Activation waits naturally; no skipWaiting. */ });
self.addEventListener('activate', () => { /* Existing clients choose a snapshot on their next full navigation. */ });
self.addEventListener('message', (event) => {
  const reply = event.ports?.[0]; if (!reply || !event.source?.id) return;
  event.waitUntil((async () => {
    if (event.data?.type === 'omnistax:current-pin') {
      const value = await pinsFor(event.source.id); reply.postMessage(value.primaryBook ? value.pins[value.primaryBook] ?? null : null); return;
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
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url); if (url.origin !== location.origin) return;
  if (url.pathname === '/offline-catalog.json') { event.respondWith(fetch(event.request, { cache: 'no-store' })); return; }
  const resolve = async () => {
    /* A failed inspection still has an active installed snapshot. Keep routing
       through it so an evicted file becomes an explicit repair error instead
       of mixing a network response into the pinned release. */
    const installs = (await records().catch(() => [])).filter((record) => record.installedRelease);
    let pin;
    if (event.request.mode === 'navigate') {
      const record = bookOf(url.pathname, installs);
      if (record) {
        const requested = url.searchParams.get('_omnistax_release');
        const release = requested && (requested === record.installedRelease || requested === record.previousRelease) ? requested : record.installedRelease;
        const artifact = artifactFor(record, release);
        if (artifact) pin = { bookId: record.bookId, release, artifact };
      }
      else if (url.pathname === '/' || url.pathname === '/index.html') { const first = installs[0]; const artifact = first && artifactFor(first, first.installedRelease); if (first && artifact) pin = { bookId: first.bookId, release: first.installedRelease, artifact }; }
      if (pin && event.resultingClientId) {
        const held = await pinsFor(event.resultingClientId); const next = { ...held, primaryBook: pin.bookId, pins: { ...held.pins, [pin.bookId]: pin } };
        pins.set(event.resultingClientId, next); await pinWrite(event.resultingClientId, next).catch(() => undefined);
      }
    } else pin = await pinnedFor(event, installs, url.pathname);
    if (pin) { const response = await cached(pin, event.request, installs) ?? (event.request.mode === 'navigate' ? await shellOf(pin) : undefined); if (response) return response; }
    try { return await fetch(event.request); }
    catch { return event.request.mode === 'navigate' ? offlinePage() : new Response('Offline resource unavailable', { status: 503 }); }
  };
  const bookId = event.request.mode === 'navigate' ? url.pathname.split('/').filter(Boolean)[0] : null;
  event.respondWith(bookId && navigator.locks ? navigator.locks.request(`omnistax-install:${bookId}`, { mode: 'shared' }, resolve) : resolve());
});
