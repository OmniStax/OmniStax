/* OmniStax offline resolver. Installations are verified by the page before its
   active pointer is committed; this worker never treats ordinary HTTP cache
   entries as a complete book. */
const DB = 'omnistax-offline', STORE = 'installations', PINS = 'clientPins';
const pins = new Map();
const openDb = () => new Promise((resolve, reject) => { const r = indexedDB.open(DB, 2); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'bookId' }); if (!r.result.objectStoreNames.contains(PINS)) r.result.createObjectStore(PINS, { keyPath: 'clientId' }); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const records = async () => { const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE); const r = tx.objectStore(STORE).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); tx.oncomplete = () => db.close(); }); };
const pinRead = async (clientId) => { if (!clientId) return null; const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(PINS);const r=tx.objectStore(PINS).get(clientId);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close()}); };
const pinWrite = async (clientId, pin) => { if (!clientId) return; const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(PINS,'readwrite');tx.objectStore(PINS).put({clientId,...pin});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}}); };
const cacheName = (book, release, artifact) => `omnistax-book:${book}:${release}:${artifact}`;
const artifactFor = (record, release) => release === record.installedRelease
  ? (record.installedArtifact || record.manifest?.runtime?.artifactId)
  : release === record.previousRelease
    ? (record.previousArtifact || record.previousManifest?.runtime?.artifactId)
    : null;
const bookOf = (pathname, installs) => { const first = pathname.split('/').filter(Boolean)[0]; return installs.find((record) => record.bookId === first); };
const pinnedFor = async (event, installs) => {
  const held = pins.get(event.clientId); if (held) return held;
  const persisted = await pinRead(event.clientId).catch(() => null); if (persisted?.artifact) { const pin={bookId:persisted.bookId,release:persisted.release,artifact:persisted.artifact}; pins.set(event.clientId,pin); return pin; }
  const client = event.clientId ? await clients.get(event.clientId) : null;
  const found = client ? bookOf(new URL(client.url).pathname, installs) : null;
  if (!found?.installedRelease) return null;
  const artifact = artifactFor(found, found.installedRelease); if (!artifact) return null;
  const pin = { bookId: found.bookId, release: found.installedRelease, artifact }; pins.set(event.clientId, pin); return pin;
};
const cached = async (pin, request) => {
  const cache = await caches.open(cacheName(pin.bookId, pin.release, pin.artifact));
  const pathname = new URL(request.url).pathname;
  return await cache.match(pathname) ?? await cache.match(pathname.endsWith('/') ? `${pathname}index.html` : !pathname.split('/').pop().includes('.') ? `${pathname}/index.html` : pathname);
};
const offlinePage = () => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OmniStax offline</title><style>body{font:16px system-ui;max-width:42rem;margin:12vh auto;padding:1rem}a{color:#1d4ed8}</style><h1>This page is not downloaded</h1><p>Open an available offline textbook from the <a href="/">OmniStax library</a>, or reconnect to download it.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

self.addEventListener('install', () => { /* Activation waits naturally; no skipWaiting. */ });
self.addEventListener('activate', () => { /* Existing clients choose a snapshot on their next full navigation. */ });
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url); if (url.origin !== location.origin) return;
  if (url.pathname === '/offline-catalog.json') { event.respondWith(fetch(event.request, { cache: 'no-store' })); return; }
  event.respondWith((async () => {
    const installs = (await records().catch(() => [])).filter((record) => record.status === 'ready' && record.installedRelease);
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
      if (pin && event.resultingClientId) { pins.set(event.resultingClientId, pin); await pinWrite(event.resultingClientId, pin).catch(() => undefined); }
    } else pin = await pinnedFor(event, installs);
    if (pin) { const response = await cached(pin, event.request); if (response) return response; }
    try { return await fetch(event.request); }
    catch { return event.request.mode === 'navigate' ? offlinePage() : new Response('Offline resource unavailable', { status: 503 }); }
  })());
});
