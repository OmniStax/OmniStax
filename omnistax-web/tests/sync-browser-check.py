"""Browser check for the Sync sidebar, against a faked GitHub API.

Run against a served site, e.g.:
    python3 tests/sync-browser-check.py http://127.0.0.1:4337 [screenshot.png]
"""

import json
import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4337").rstrip("/")
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
PATH = "/college-physics-2e/ch01/1.1/"

MANIFEST = {"format": "omnistax-sync", "version": 1, "exportedAt": "2026-10-05T12:00:00.000Z", "books": [], "files": [], "images": [],
            "labels": {"chats/abcd1234.json": "Springs from the laptop"}}
TREE = [
    {"path": "omnistax.json", "type": "blob", "sha": "m" * 40, "size": 200},
    {"path": "records/appearance.json", "type": "blob", "sha": "a" * 40, "size": 40},
    {"path": "chats/abcd1234.json", "type": "blob", "sha": "c" * 40, "size": 900},
    {"path": "README.md", "type": "blob", "sha": "r" * 40, "size": 10},
]


def github(route):
    url = route.request.url
    if "/git/ref/heads/" in url:
        return route.fulfill(json={"object": {"sha": "1" * 40}})
    if "/git/commits/" in url:
        return route.fulfill(json={"tree": {"sha": "2" * 40}})
    if "/git/trees/" in url:
        return route.fulfill(json={"truncated": False, "tree": TREE})
    if url.endswith("/git/blobs/" + "m" * 40):
        return route.fulfill(body=json.dumps(MANIFEST))
    if url.endswith("/git/blobs/" + "a" * 40):
        return route.fulfill(body='{\n  "omnistax-theme": "sepia"\n}\n')
    return route.fulfill(status=500, body="{}")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 860})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("https://api.github.com/**", github)
    page.goto(BASE + PATH)
    page.wait_for_selector(".shell")

    # Unconnected, the view is the setup form, opened from the foot of the rail.
    page.locator("#sync-btn").click()
    view = page.locator(".sync")
    view.get_by_text("A repo of your own").wait_for()
    assert page.evaluate("document.querySelector('#sync-btn').nextElementSibling.id") == "palette-btn"

    page.evaluate("""
      localStorage.setItem('omnistax-theme', 'dark');
      localStorage.setItem('omnistax-sync-v1', JSON.stringify({repo: 'chen/notes', branch: 'main', last: null}));
      localStorage.setItem('omnistax-github-token', 'github_pat_test');
    """)
    page.reload()
    page.wait_for_selector(".shell")
    view = page.locator(".sync")
    view.locator(".status").filter(has_text="to pull").wait_for(timeout=20000)

    # Only what differs is listed: the repo's README and the agreeing files never show.
    labels = view.locator(".file .label").all_inner_texts()
    assert not any("README" in label for label in labels), labels
    assert any("Springs from the laptop" in label for label in labels), labels
    assert view.locator(".sec-name", has_text="Changed in both").is_visible()

    # A file changed on both sides holds the sync until a version is chosen.
    go = view.locator(".go").first
    assert go.is_disabled() and go.inner_text().startswith("Choose a version"), go.inner_text()

    # A row opens the file's changes as a tab, where the version can be chosen too.
    view.locator(".file", has_text="appearance").click()
    diff = page.locator(".diff")
    diff.locator(".line.add", has_text="omnistax-theme").wait_for(timeout=20000)
    assert diff.locator(".line.del", has_text="sepia").count() == 1
    if SHOT:
        page.screenshot(path=SHOT.replace(".png", "-diff.png"))
    diff.get_by_role("button", name="Keep this device’s").click()
    assert go.is_enabled() and go.inner_text().startswith("Pull 1 and push"), go.inner_text()

    # Forcing sits in the menu beside the button and asks first, naming what is lost.
    view.get_by_role("button", name="More sync actions").click()
    menu = view.get_by_role("menu")
    assert menu.get_by_role("menuitem").count() == 4
    if SHOT:
        page.locator(".sidebar").screenshot(path=SHOT)
    menu.get_by_role("menuitem", name="Force pull").click()
    dialog = page.locator("dialog[open]")
    dialog.get_by_text("made on this device will be discarded").wait_for()
    if SHOT:
        page.screenshot(path=SHOT.replace(".png", "-force.png"))
    dialog.get_by_role("button", name="Cancel").click()
    assert page.locator("dialog[open]").count() == 0
    view.get_by_role("button", name="Export", exact=True).wait_for()

    assert not errors, errors
    print("sync-browser-check: ok")
    browser.close()
