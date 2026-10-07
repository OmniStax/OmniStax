"""The app opens offline with no book downloaded, after one online visit."""
import functools
import http.server
import json
import pathlib
import tempfile
import threading
from playwright.sync_api import sync_playwright

DIST = pathlib.Path(__file__).resolve().parents[1] / "dist"
BOOK = "sandbox"
PATH = f"/{BOOK}/ch01/1.1/"

# Chromium exempts service-worker fetches from Playwright's offline emulation,
# so the origin itself goes down: a request it drops fails in the worker too.
class Handler(http.server.SimpleHTTPRequestHandler):
  down = False
  def do_GET(self):
    if Handler.down: self.close_connection = True; return
    return super().do_GET()
  def log_message(self, *_args):
    pass

server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=DIST))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"
shell_id = json.loads((DIST / "offline-shell.json").read_text())["shellId"]

with sync_playwright() as playwright:
  with tempfile.TemporaryDirectory(prefix='omnistax-shell-profile-') as profile:
    context = playwright.chromium.launch_persistent_context(profile)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE + "/")
    page.wait_for_selector(".shell")
    page.evaluate("navigator.serviceWorker.ready")
    page.wait_for_function("""async id => !!await (await caches.open(`omnistax-shell:${id}`)).match('/offline-shell.json')""", arg=shell_id, timeout=120_000, polling=500)

    # A stale shell is deleted once the current one is complete.
    page.evaluate("""async () => { const c = await caches.open('omnistax-shell:stale'); await c.put('/offline-shell.json', new Response('{}')); }""")
    page.reload()
    page.wait_for_selector(".shell")
    page.wait_for_function("""async () => !(await caches.keys()).includes('omnistax-shell:stale')""", timeout=30_000, polling=500)
    assert not page.evaluate("""async () => (await caches.keys()).some(name => name.startsWith('omnistax-book:'))""")

    Handler.down = True
    page.reload()
    page.wait_for_selector(".shell", timeout=20_000)
    assert page.get_by_text("This page is not downloaded").count() == 0
    page.locator("#gear").click()
    page.locator("#settings").wait_for(state="visible")
    page.keyboard.press("Escape")

    # A section of a book not downloaded opens the shell on the book's front,
    # and the section's own pane says it cannot load.
    page.goto(BASE + PATH)
    page.wait_for_selector(".shell", timeout=20_000)
    page.locator(".loading.bad").first.wait_for(timeout=20_000)
    assert not errors, errors
    context.close()
    print("offline shell browser check passed")
