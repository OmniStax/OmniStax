"""Archive-backed publish A -> app-only deploy -> content release B: live-first
pages, the reload toast, background installs that reuse unchanged files, the
offline snapshot before and after them, pins, provenance and reclaim."""
import functools
import http.server
import json
import pathlib
import subprocess
import tempfile
import threading
import time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "omnistax-content" / "Figure Sandbox"

with tempfile.TemporaryDirectory(prefix="omnistax-update-") as temporary:
    temp = pathlib.Path(temporary)
    output = temp / "dist"
    result = subprocess.run(
        ["node", "tests/offline-update-fixture.mjs", "dist", str(output), str(temp), str(SOURCE)],
        cwd=ROOT, check=True, capture_output=True, text=True,
    )
    releases = json.loads(result.stdout)
    a, b, art_a, art_app = releases['a'], releases['b'], releases['artifactA'], releases['artifactApp']
    assert releases['appRelease'] == a and art_app != art_a and releases['artifactB'] == art_app, releases

    def manifest(release, artifact):
        return json.loads((output / 'offline' / 'releases' / 'sandbox' / release / artifact / 'manifest.json').read_text())
    held_a = {(r['sha256'], r['mime']) for r in manifest(a, art_a)['resources']}
    changed_app = {r['downloadUrl'] for r in manifest(a, art_app)['resources'] if (r['sha256'], r['mime']) not in held_a}
    assert changed_app, 'the app-only deploy changes no file'

    # Chromium exempts service-worker fetches from Playwright's offline
    # emulation, so the origin itself goes down: a dropped request fails in
    # the worker too. A stalled download holds a background install open.
    class Handler(http.server.SimpleHTTPRequestHandler):
        phase = "a"; down = False; stall = False; requests = []
        def translate_path(self, path):
            real = pathlib.Path(super().translate_path(path))
            layer = temp / f"live-{Handler.phase}" / real.relative_to(output)
            return str(layer if layer.is_file() or (layer / 'index.html').is_file() else real)
        def do_GET(self):
            Handler.requests.append(self.path)
            if self.path.startswith('/offline/releases/') and not self.path.endswith('/manifest.json'):
                while Handler.stall and not Handler.down: time.sleep(0.05)
            if Handler.down: self.close_connection = True; return
            if self.path.split("?", 1)[0] == "/offline-catalog.json":
                self.path = f"/offline-catalog-{Handler.phase}.json"
            return super().do_GET()
        # The fixture changes a hashed file in place, which a real deploy never does.
        def end_headers(self):
            self.send_header('Cache-Control', 'no-store'); super().end_headers()
        def log_message(self, *_args):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=output))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    path = "/sandbox/ch01/1.1/"

    RECORD = """async () => {const db=await new Promise((ok,no)=>{const r=indexedDB.open('omnistax-offline');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});return await new Promise((ok,no)=>{const t=db.transaction('installations');const r=t.objectStore('installations').get('sandbox');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}"""
    PIN = """() => new Promise(resolve => { const c=new MessageChannel();c.port1.onmessage=e=>resolve(e.data);navigator.serviceWorker.controller.postMessage({type:'omnistax:current-pin'},[c.port2]) })"""
    MARKER = "getComputedStyle(document.documentElement).getPropertyValue('--omnistax-fixture').trim()"
    FILES = """async () => Promise.all(['/sandbox/book.json','/sandbox/search.json','/sandbox/exercises.json','/sandbox/ch01/1.1/doc.html','/sandbox/ch01/1.1/figures.js'].map(async url => [url,(await fetch(url)).status]))"""

    def until(page, test, timeout=120):
        end = time.time() + timeout
        while True:
            record = page.evaluate(RECORD)
            if test(record): return record
            assert time.time() < end, record
            page.wait_for_timeout(200)

    def opened(context, url=path):
        page = context.new_page(); page.goto(base + url); page.wait_for_selector('.shell', timeout=20_000); page.evaluate('navigator.serviceWorker.ready')
        return page

    def whole(page):
        assert page.locator('article[data-sec="1.1"]').count() >= 1
        fetched = page.evaluate(FILES)
        assert all(status == 200 for _, status in fetched), fetched

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context()
            old = opened(context)
            old.locator('.row.r-find').click(); row = old.locator('.finder .book[data-book="sandbox"]')
            row.get_by_role('button', name='Download for offline use').click()
            row.get_by_text('Available offline', exact=True).wait_for(timeout=120_000)
            installed = old.evaluate(RECORD)
            old.reload(); old.wait_for_selector('.shell'); old.evaluate('navigator.serviceWorker.ready')
            until(old, lambda record: record.get('lastCheck') != installed.get('lastCheck'))
            assert old.evaluate(PIN)['release'] == a
            assert old.evaluate(MARKER) == ''

            # An app-only deploy. Opening the finder checks the catalog: the open
            # tab is told, and the book starts re-installing on its own.
            Handler.phase = "app"; Handler.stall = True; Handler.requests.clear()
            old.locator('.row.r-find').click()
            old.locator('.update-toast').filter(has_text='OmniStax was updated.').wait_for(timeout=20_000)
            until(old, lambda record: record.get('stagingArtifact') == art_app)
            fresh = opened(context)
            assert fresh.evaluate(MARKER) == 'app', 'an installed book opened online shows the live app'

            # Offline before the background install finishes: the old snapshot
            # opens whole.
            Handler.down = True
            until(old, lambda record: record.get('error'))
            cold = opened(context)
            assert cold.evaluate(MARKER) == ''
            whole(cold)
            assert cold.evaluate(RECORD)['installedArtifact'] == art_a

            # Back online, the next check finishes the install. Unchanged files
            # come from the active snapshot, so only the changed ones download.
            Handler.down = False; Handler.stall = False
            cold.evaluate("dispatchEvent(new Event('online'))")
            cold.locator('.update-toast').wait_for(timeout=20_000)
            record = until(cold, lambda record: record.get('installedArtifact') == art_app)
            assert record['installedRelease'] == a and record['previousArtifact'] == art_a, record
            fetched = {p for p in Handler.requests if p.startswith(f'/offline/releases/sandbox/{a}/{art_app}/') and not p.endswith('/manifest.json')}
            assert fetched == changed_app, (fetched, changed_app)

            old.get_by_role('button', name='Reload').click()
            old.wait_for_selector('.shell'); old.wait_for_timeout(2000)
            assert old.evaluate(MARKER) == 'app'
            assert old.locator('.update-toast').count() == 0

            # An offline cold start afterwards shows the new app.
            Handler.down = True
            cold_after = opened(context)
            assert cold_after.evaluate(MARKER) == 'app'
            whole(cold_after)
            Handler.down = False
            for page in (old, fresh, cold, cold_after): page.close()

            # A content release: the book re-installs on its own, the changed
            # section is marked, and the open tab keeps its pin.
            Handler.phase = "b"
            reader = opened(context)
            record = until(reader, lambda record: record.get('installedRelease') == b)
            assert record['previousRelease'] == a and record['previousArtifact'] == art_app, record
            reader.locator('.updated').filter(has_text='Updated').first.wait_for(timeout=20_000)
            assert reader.evaluate(PIN)['release'] == a
            assert 'offline-release-b' in reader.evaluate("fetch('/sandbox/ch01/1.1/doc.html').then(r=>r.text())")
            newer = opened(context)
            assert newer.evaluate(PIN)['release'] == b

            # A known-provenance saved session retains A after its live tab closes.
            newer.evaluate("""release => localStorage.setItem('omnistax-practice-sessions-v2', JSON.stringify({saved:{id:'saved',curriculum:[],concepts:[],drawn:[{book:'sandbox',section:'1.1',ex:'x',why:'review',release}],at:0,outcomes:[null],started:1,before:{}}}))""", a)
            reader.close(); newer.reload(); newer.wait_for_selector('.shell'); newer.wait_for_timeout(2000)
            assert newer.evaluate(RECORD).get('previousRelease') == a

            newer.evaluate("localStorage.removeItem('omnistax-practice-sessions-v2')")
            newer.reload(); newer.wait_for_selector('.shell')
            until(newer, lambda record: not record.get('previousRelease'), timeout=6)
            assert not newer.evaluate("name => caches.has(name)", f"omnistax-book:sandbox:{a}:{art_app}")
            browser.close()
    finally:
        server.shutdown(); server.server_close(); thread.join()

print('offline archive update browser check passed')
