"""Verified download and cold offline navigation against a production build."""
import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4337").rstrip("/")
BOOK = "sandbox"
PATH = f"/{BOOK}/ch01/1.1/"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE + PATH)
    page.wait_for_selector(".shell")
    page.evaluate("navigator.serviceWorker.ready")

    # The catalogue action is distinct from adding a book to the reader tree.
    page.locator('.row.r-find').click()
    finder = page.locator('.finder')
    finder.wait_for(state='visible')
    row = finder.locator(f'.book[data-book="{BOOK}"]')
    # Persistence denial is advisory, while an actual quota-style Cache write
    # failure must leave resumable bookkeeping and a useful retry state.
    page.evaluate("""() => {
      Object.defineProperty(navigator.storage, 'persist', { configurable: true, value: async () => false });
      globalThis.__omnistaxCachePut = Cache.prototype.put;
      let first = true;
      Cache.prototype.put = function (...args) {
        if (first) { first = false; throw new DOMException('Injected quota failure.', 'QuotaExceededError'); }
        return globalThis.__omnistaxCachePut.apply(this, args);
      };
    }""")
    row.get_by_role('button', name='Download for offline use').click()
    finder.locator('.bad').filter(has_text='Injected quota failure.').wait_for(timeout=30_000)
    page.evaluate("() => { Cache.prototype.put = globalThis.__omnistaxCachePut; }")
    row.get_by_role('button', name='Retry download').click()
    # Integrity checking intentionally hashes every runtime/font artifact. Give
    # slow local/static hosts room to complete without weakening that check.
    row.get_by_text('Available offline', exact=True).wait_for(timeout=120_000)
    assert row.get_by_role('button', name='Add').count() == 0 or row.get_by_role('button', name='Added').count() == 1

    record = page.evaluate("""async id => { const db=await new Promise((ok,no)=>{const r=indexedDB.open('omnistax-offline');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});return await new Promise((ok,no)=>{const tx=db.transaction('installations');const r=tx.objectStore('installations').get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}) }""", BOOK)
    assert record['status'] == 'ready' and record['installedRelease']
    assert len(record['manifest']['resources']) > 5

    # A client already navigated on release A stays there after B becomes the
    # active pointer; a new client selects B. Probe entries make the cache
    # choice observable without maintaining a second large fixture on disk.
    page.reload()
    page.wait_for_selector('.shell')
    release_b = 'b' * 64
    page.evaluate("""async ({ id, releaseB }) => {
      const db = await new Promise((ok,no)=>{const r=indexedDB.open('omnistax-offline');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
      const record = await new Promise((ok,no)=>{const tx=db.transaction('installations');const r=tx.objectStore('installations').get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
      const oldName = `omnistax-book:${id}:${record.installedRelease}:${record.installedArtifact}`;
      const newName = `omnistax-book:${id}:${releaseB}:${record.installedArtifact}`;
      const oldCache = await caches.open(oldName), newCache = await caches.open(newName);
      for (const request of await oldCache.keys()) await newCache.put(request, await oldCache.match(request));
      await oldCache.put('/pin-probe.txt', new Response('A'));
      await newCache.put('/pin-probe.txt', new Response('B'));
      await new Promise((ok,no)=>{const tx=db.transaction('installations','readwrite');tx.objectStore('installations').put({...record,previousRelease:record.installedRelease,previousArtifact:record.installedArtifact,previousManifest:record.manifest,installedRelease:releaseB});tx.oncomplete=ok;tx.onerror=()=>no(tx.error)});
    }""", {'id': BOOK, 'releaseB': release_b})
    newer = context.new_page()
    newer.goto(BASE + PATH)
    newer.wait_for_selector('.shell')
    assert page.evaluate("fetch('/pin-probe.txt').then(r => r.text())") == 'A'
    assert newer.evaluate("fetch('/pin-probe.txt').then(r => r.text())") == 'B'
    newer.evaluate("""async ({ id, original, releaseB }) => {
      const db = await new Promise((ok,no)=>{const r=indexedDB.open('omnistax-offline');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
      await new Promise((ok,no)=>{const tx=db.transaction('installations','readwrite');tx.objectStore('installations').put(original);tx.oncomplete=ok;tx.onerror=()=>no(tx.error)});
      await caches.delete(`omnistax-book:${id}:${releaseB}:${original.installedArtifact}`);
    }""", {'id': BOOK, 'original': record, 'releaseB': release_b})
    newer.close()

    # Close the warm tab, disable network for the entire browser profile, and
    # navigate directly to a deep URL. HTML boot data, chunks and book JSON all
    # have to come from the selected verified release.
    page.close()
    context.set_offline(True)
    offline = context.new_page()
    offline.goto(BASE + PATH)
    offline.wait_for_selector('.shell', timeout=20_000)
    assert offline.locator('article[data-sec="1.1"]').count() >= 1
    assert offline.locator('canvas').count() >= 1
    fetched = offline.evaluate("""async () => Promise.all(['/sandbox/book.json','/sandbox/search.json','/sandbox/exercises.json','/sandbox/ch01/1.1/doc.html','/sandbox/ch01/1.1/figures.js'].map(async url => [url,(await fetch(url)).status]))""")
    assert all(status == 200 for _, status in fetched), fetched
    offline.locator('#gear').click()
    offline.locator('#settings').wait_for(state='visible')
    offline.keyboard.press('Escape')
    assert not errors, errors

    root = context.new_page()
    root.goto(BASE + '/')
    root.wait_for_selector('.shell', timeout=20_000)

    context.set_offline(False)

    # Eviction is detected on restart and repair resumes from the resources
    # still present instead of discarding personal data or the whole cache.
    root.close()
    offline.close()
    repair = context.new_page()
    repair.goto(BASE + PATH)
    repair.wait_for_selector('.shell')
    repair.evaluate("""async id => {
      const db = await new Promise((ok, no) => { const r=indexedDB.open('omnistax-offline'); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error) });
      const record = await new Promise((ok, no) => { const tx=db.transaction('installations'); const r=tx.objectStore('installations').get(id); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error) });
      const name = `omnistax-book:${id}:${record.installedRelease}:${record.installedArtifact}`;
      await (await caches.open(name)).delete('/sandbox/search.json');
    }""", BOOK)
    repair.reload()
    repair.wait_for_selector('.shell')
    repair.locator('.row.r-find').click()
    repair_row = repair.locator('.finder').locator(f'.book[data-book="{BOOK}"]')
    repair_row.get_by_role('button', name='Repair download').wait_for(timeout=20_000)
    repair_row.get_by_role('button', name='Repair download').click()
    repair_row.get_by_text('Available offline', exact=True).wait_for(timeout=120_000)

    print('offline textbook browser check passed')
    browser.close()
