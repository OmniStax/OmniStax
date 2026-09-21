"""Archive-backed publish A -> publish B update, pin, provenance and reclaim."""
import functools
import http.server
import json
import pathlib
import subprocess
import tempfile
import threading
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

    class Handler(http.server.SimpleHTTPRequestHandler):
        catalog = "offline-catalog-a.json"
        def do_GET(self):
            if self.path == "/__fixture__/release-b":
                Handler.catalog = "offline-catalog-b.json"
                self.send_response(204); self.end_headers(); return
            if self.path.split("?", 1)[0] == "/offline-catalog.json":
                self.path = "/" + Handler.catalog
            return super().do_GET()
        def log_message(self, *_args):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=output))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    path = "/sandbox/ch01/1.1/"

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context()
            old = context.new_page(); old.goto(base + path); old.wait_for_selector('.shell')
            old.locator('.row.r-find').click(); row = old.locator('.finder .book[data-book="sandbox"]')
            row.get_by_role('button', name='Download for offline use').click()
            row.get_by_text('Available offline', exact=True).wait_for(timeout=120_000)
            old.reload(); old.wait_for_selector('.shell'); old.evaluate('navigator.serviceWorker.ready')

            pin_a = old.evaluate("""() => new Promise(resolve => { const c=new MessageChannel();c.port1.onmessage=e=>resolve(e.data);navigator.serviceWorker.controller.postMessage({type:'omnistax:current-pin'},[c.port2]) })""")
            assert pin_a['release'] == releases['a'], pin_a
            old.request.get(base + '/__fixture__/release-b')
            old.locator('.row.r-find').click(); finder = old.locator('.finder'); finder.get_by_role('button', name='Check for updates').click()
            finder.get_by_text('update available', exact=False).wait_for(timeout=20_000)
            row = finder.locator('.book[data-book="sandbox"]')
            row.get_by_role('button', name='View changes').click()
            row.locator('.change-note').filter(has_text='1 changed').wait_for(timeout=20_000)
            update = row.get_by_role('button', name='Update')
            update.click()
            # The Update button is only rendered while an update is pending, so its
            # removal - not the always-present 'Available offline' label - marks the
            # install as finished.
            update.wait_for(state='detached', timeout=120_000)
            row.get_by_text('Available offline', exact=True).wait_for(timeout=120_000)

            record = old.evaluate("""async () => {const db=await new Promise((ok,no)=>{const r=indexedDB.open('omnistax-offline');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});return await new Promise((ok,no)=>{const t=db.transaction('installations');const r=t.objectStore('installations').get('sandbox');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}""")
            assert record['installedRelease'] == releases['b'] and record['previousRelease'] == releases['a'], record
            pin_after = old.evaluate("""() => new Promise(resolve => { const c=new MessageChannel();c.port1.onmessage=e=>resolve(e.data);navigator.serviceWorker.controller.postMessage({type:'omnistax:current-pin'},[c.port2]) })""")
            assert pin_after['release'] == releases['a'], pin_after
            assert 'offline-release-b' not in old.evaluate("fetch('/sandbox/ch01/1.1/doc.html').then(r=>r.text())")

            newer = context.new_page(); newer.goto(base + path); newer.wait_for_selector('.shell')
            assert 'offline-release-b' in newer.evaluate("fetch('/sandbox/ch01/1.1/doc.html').then(r=>r.text())")

            # A known-provenance saved session retains A after its live tab closes.
            newer.evaluate("""release => localStorage.setItem('omnistax-practice-sessions-v2', JSON.stringify({saved:{id:'saved',curriculum:[],concepts:[],drawn:[{book:'sandbox',section:'1.1',ex:'x',why:'review',release}],at:0,outcomes:[null],started:1,before:{}}}))""", releases['a'])
            old.close(); newer.reload(); newer.wait_for_selector('.shell'); newer.wait_for_timeout(2000)
            retained = newer.evaluate("""async () => {const db=await new Promise((ok,no)=>{const r=indexedDB.open('omnistax-offline');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});return await new Promise(ok=>{const t=db.transaction('installations');const r=t.objectStore('installations').get('sandbox');r.onsuccess=()=>ok(r.result)})}""")
            assert retained.get('previousRelease') == releases['a'], retained

            newer.evaluate("localStorage.removeItem('omnistax-practice-sessions-v2')")
            newer.reload(); newer.wait_for_selector('.shell')
            for _ in range(30):
                reclaimed = newer.evaluate("""async () => {const db=await new Promise((ok,no)=>{const r=indexedDB.open('omnistax-offline');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});return await new Promise(ok=>{const t=db.transaction('installations');const r=t.objectStore('installations').get('sandbox');r.onsuccess=()=>ok(r.result)})}""")
                if not reclaimed.get('previousRelease'): break
                newer.wait_for_timeout(200)
            assert not reclaimed.get('previousRelease'), reclaimed
            cache_a = f"omnistax-book:sandbox:{releases['a']}:{record['previousArtifact']}"
            assert not newer.evaluate("name => caches.has(name)", cache_a)
            browser.close()
    finally:
        server.shutdown(); server.server_close(); thread.join()

print('offline archive update browser check passed')
