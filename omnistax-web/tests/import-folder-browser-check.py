"""Browser check for #16, #31 and #20: a folder imported whole, the storage
allowance line, and a symbol card naming the key's other meaning.

    python3 tests/import-folder-browser-check.py http://127.0.0.1:8096 [shots-dir]
"""

import pathlib
import shutil
import sys
import tempfile

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8091").rstrip("/")
SHOTS = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
HERE = pathlib.Path(__file__).resolve().parent
PDF = HERE / "fixtures" / "two-pages.pdf"
PNG = HERE / "fixtures" / "swatch.png"


def shot(page, name):
    if SHOTS:
        page.screenshot(path=str(SHOTS / name))


def folder():
    root = pathlib.Path(tempfile.mkdtemp()) / "Course"
    (root / "week 1").mkdir(parents=True)
    (root / "empty").mkdir()
    shutil.copy(PDF, root / "week 1" / "slides.pdf")
    shutil.copy(PNG, root / "cover.png")
    (root / "plan.md").write_text("# Plan\n")
    (root / "grades.xlsx").write_bytes(b"x")
    (root / ".DS_Store").write_bytes(b"x")
    return root


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--use-gl=swiftshader"])
    page = browser.new_page(viewport={"width": 1500, "height": 950})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    page.goto(BASE + "/college-physics-2e/ch15/15.5/")
    page.wait_for_selector(".shell")
    page.evaluate("localStorage.clear()")
    page.reload()
    page.wait_for_selector(".shell")

    # ── #20: the symbol card ────────────────────────────────────────────────
    sym = page.locator('article [data-sym="W_prime"]').first
    sym.scroll_into_view_if_needed()
    sym.hover()
    card = page.locator(".hover-card")
    card.wait_for(state="visible", timeout=5000)
    text = card.inner_text()
    assert "elsewhere in this chapter (15.3)" in text.lower(), text
    shot(page, "small-card.png")
    page.mouse.move(5, 5)

    # ── #16: the import menu and a folder ───────────────────────────────────
    tree = page.locator('.view[data-view="explorer"]')
    if not tree.is_visible():
        page.get_by_role("button", name="Explorer", exact=True).click()
    tree.wait_for(state="visible")
    icon = page.locator("#import-files")
    assert "PNG, JPG" in (icon.get_attribute("title") or "")
    tree.locator(".row", has_text="Your Files").first.hover()
    icon.click()
    menu = page.locator(".menu")
    menu.wait_for(state="visible")
    assert "Import folder" in menu.inner_text(), menu.inner_text()
    shot(page, "small-import-menu.png")
    page.keyboard.press("Escape")

    page.set_input_files(".picker-dir", str(folder()))
    page.wait_for_function("JSON.parse(localStorage.getItem('omnistax-files-v1') || '[]').length === 2", timeout=30000)
    names = page.evaluate("JSON.parse(localStorage.getItem('omnistax-explorer-v1')).entries.map(e => e.kind + ':' + e.name)")
    for want in ("folder:Course", "folder:week 1", "file:slides", "file:cover", "note:plan"):
        assert want in names, names
    assert "folder:empty" not in names, names
    body = page.inner_text("body")
    assert "grades.xlsx" in body and "DS_Store" not in body, "refusal notice"
    shot(page, "small-folder.png")

    page.keyboard.press("Control+z")
    page.wait_for_timeout(300)
    left = page.evaluate("JSON.parse(localStorage.getItem('omnistax-explorer-v1')).entries.map(e => e.name)")
    assert not any(n in left for n in ("Course", "week 1", "slides", "cover", "plan")), left
    page.keyboard.press("Control+Shift+z")
    page.wait_for_timeout(300)
    back = page.evaluate("JSON.parse(localStorage.getItem('omnistax-explorer-v1')).entries.map(e => e.name)")
    assert all(n in back for n in ("Course", "week 1", "slides", "cover", "plan")), back

    # ── #31: the allowance line ─────────────────────────────────────────────
    page.locator("#gear").click()
    page.locator("#settings").wait_for(state="visible")
    page.locator("#settings", has_text="Your browser allows this site about").wait_for(timeout=5000)
    shot(page, "small-storage.png")

    assert not errors, errors
    browser.close()
    print("ok")
