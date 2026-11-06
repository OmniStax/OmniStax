"""Browser check for the data format: records an older build kept under old
names move to their names as the app starts and the stores read them; a sync
repo a newer build last synced is left alone with a way to update; one an
older build last synced is moved to this format by one sync, with each
record's row saying what it holds.

Run against a served site, e.g.:
    python3 tests/data-format-browser-check.py http://127.0.0.1:4337 [screenshot.png]
"""

import base64
import json
import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4337").rstrip("/")
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
PATH = "/college-physics-2e/ch01/1.1/"
AT = "2026-11-06T12:00:00.000Z"

state = {"manifest": None, "files": {}}
writes = []


def blob_sha(path):
    return (str(abs(hash(path))) + "0" * 40)[:40]


def github(route):
    url, method = route.request.url, route.request.method
    if method != "GET":
        writes.append((method, url.split("/repos/chen/notes")[-1], route.request.post_data))
        if url.endswith("/git/blobs"):
            return route.fulfill(json={"sha": "b" * 40})
        if url.endswith("/git/trees"):
            return route.fulfill(json={"sha": "t" * 40})
        if url.endswith("/git/commits"):
            return route.fulfill(json={"sha": "c" * 40})
        return route.fulfill(json={})
    if "/git/ref/heads/" in url:
        return route.fulfill(json={"object": {"sha": "1" * 40}})
    if "/git/commits/" in url:
        return route.fulfill(json={"tree": {"sha": "2" * 40}})
    files = {"omnistax.json": json.dumps(state["manifest"]), **state["files"]}
    if "/git/trees/" in url:
        return route.fulfill(json={"truncated": False, "tree": [{"path": p, "type": "blob", "sha": blob_sha(p), "size": len(b)} for p, b in files.items()]})
    for p, b in files.items():
        if url.endswith("/git/blobs/" + blob_sha(p)):
            return route.fulfill(body=b)
    return route.fulfill(status=404, body="{}")


def manifest(version, **extra):
    return {"format": "omnistax-sync", "version": version, "exportedAt": AT, "books": [], "files": [], "images": [], "labels": {}, **extra}


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 860})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("https://api.github.com/**", github)
    page.goto(BASE + PATH)
    page.wait_for_selector(".shell")

    # ── As the app starts, old names move to the names they have now. ──
    page.evaluate("""() => {
      localStorage.clear();
      localStorage.setItem('omnistax-library-v1', JSON.stringify(['college-physics-2e']));
      localStorage.setItem('omnistax-chats-v3', JSON.stringify([{ id: 'abcd1234', name: 'Springs', created: 1, updated: 2 }]));
      localStorage.setItem('omnistax-chats-v1', JSON.stringify([{ id: 'abcd1234', name: 'Springs', created: 1, updated: 2 }]));
      localStorage.setItem('omnistax-keys-v2', JSON.stringify({}));
      localStorage.setItem('omnistax-tips-v1', JSON.stringify({ first: 1, day: null, next: 0 }));
      localStorage.setItem('omnistax-layout-v5', '{}');
      localStorage.setItem('omnistax-underlines', '0');
      localStorage.setItem('omnistax-theme', 'dark');
    }""")
    page.reload()
    page.wait_for_selector(".shell")
    keys = page.evaluate("Object.keys(localStorage).filter((k) => k.startsWith('omnistax-')).sort()")
    old = [k for k in keys if k in ("omnistax-library-v1", "omnistax-chats-v3", "omnistax-chats-v1", "omnistax-keys-v2", "omnistax-tips-v1", "omnistax-layout-v5", "omnistax-underlines")]
    assert not old, old
    for k in ("omnistax-library", "omnistax-chat-index", "omnistax-shortcuts", "omnistax-tip-history", "omnistax-theme"):
        assert k in keys, (k, keys)
    # The stores read the moved records: the chat is listed by the palette's chat search.
    assert "Springs" in page.evaluate("localStorage.getItem('omnistax-chat-index')")
    assert page.evaluate("JSON.parse(localStorage.getItem('omnistax-library'))") == ["college-physics-2e"]
    # The chats index is no longer written twice.
    assert page.evaluate("localStorage.getItem('omnistax-chats-v1')") is None

    # ── A repo a newer build last synced: an update, and nothing written. ──
    state["manifest"] = manifest(99, app="2027.1.5.0")
    state["files"] = {"records/omnistax-theme.json": '"light"\n'}
    page.evaluate("""() => {
      localStorage.setItem('omnistax-sync-v1', JSON.stringify({ repo: 'chen/notes', branch: 'main', last: null }));
      localStorage.setItem('omnistax-github-token', 'github_pat_test');
    }""")
    page.reload()
    page.wait_for_selector(".shell")
    page.locator("#sync-btn").click()
    view = page.locator(".sync")
    view.get_by_text("last synced by a newer OmniStax (2027.1.5.0)").wait_for(timeout=20000)
    view.get_by_role("button", name="Reload").wait_for()
    assert not writes, writes
    if SHOT:
        page.locator(".sidebar").screenshot(path=SHOT.replace(".png", "-newer.png"))

    # ── A repo an older build last synced: shown under today's names, one sync moves it. ──
    state["manifest"] = manifest(2)
    state["files"] = {
        "records/omnistax-theme.json": '"light"\n',
        "records/omnistax-library-v1.json": '[\n  "college-physics-2e"\n]\n',
        "records/omnistax-chats-v1.json": '[]\n',
    }
    view.get_by_role("button", name="Check for changes").click()
    view.get_by_text("moves this repo to the current format").wait_for(timeout=20000)
    rows = view.locator(".file")
    # The theme differs; the library under its old name is the same as this device's under its new.
    theme = rows.filter(has_text="omnistax-theme")
    theme.wait_for()
    assert "Light or dark theme" in theme.inner_text(), theme.inner_text()
    labels = rows.all_inner_texts()
    assert not any("-v1" in t for t in labels), labels
    assert not any("omnistax-library" in t for t in labels), labels
    if SHOT:
        page.locator(".sidebar").screenshot(path=SHOT)
    theme.click()
    page.locator(".diff .what", has_text="Light or dark theme").wait_for()
    page.locator(".diff .path", has_text="records/omnistax-theme.json").wait_for()
    if SHOT:
        page.screenshot(path=SHOT.replace(".png", "-diff.png"))

    # Keep this device's theme and sync: the push drops the old names and writes the gate and a current manifest.
    page.locator(".diff").get_by_role("button", name="Keep this device’s").click()
    view.locator(".go").first.click()
    for _ in range(100):
        if any(m == "PATCH" for m, _, _ in writes):
            break
        page.wait_for_timeout(100)
    tree = next(json.loads(b) for m, p, b in writes if p == "/git/trees")["tree"]
    by_path = {e["path"]: e["sha"] for e in tree}
    assert by_path.get("records/omnistax-library-v1.json", "x") is None, by_path
    assert by_path.get("records/omnistax-chats-v1.json", "x") is None, by_path
    assert "records/_requires-newer-omnistax.json" in by_path and "omnistax.json" in by_path, by_path
    sent = [json.loads(b) for m, p, b in writes if p == "/git/blobs"]
    manifests = [json.loads(base64.b64decode(s["content"])) for s in sent if b'"omnistax-sync"' in base64.b64decode(s["content"])]
    assert manifests and manifests[-1]["version"] == 3 and manifests[-1].get("app"), manifests

    assert not errors, errors
    print("data-format-browser-check: ok")
    browser.close()
