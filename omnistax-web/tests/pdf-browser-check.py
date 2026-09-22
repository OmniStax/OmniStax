"""Browser check for the reader's own files: importing, reading, marking, searching.

Run against a served build, for example:
    python3 tests/pdf-browser-check.py http://127.0.0.1:8091

It imports the two fixtures under tests/fixtures (regenerate them with
tests/fixtures/make-file-fixtures.py), opens the PDF, follows a page link out
of a note, highlights a word and finds it again after a reload, and searches
for "zyxomni", which only page 2 of the fixture holds.
"""

import pathlib
import sys

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8091").rstrip("/")
HERE = pathlib.Path(__file__).resolve().parent
PDF = HERE / "fixtures" / "two-pages.pdf"
PNG = HERE / "fixtures" / "swatch.png"
PATH = "/college-physics-2e/ch01/1.1/"

assert PDF.exists() and PNG.exists(), "run tests/fixtures/make-file-fixtures.py first"


def explorer(page):
    """The explorer in the left sidebar, opened if it is not already showing."""
    tree = page.locator('.view[data-view="explorer"]')
    if not tree.is_visible():
        page.get_by_role("button", name="Explorer", exact=True).click()
    tree.wait_for(state="visible")
    return tree


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--use-gl=swiftshader"])
    page = browser.new_page(viewport={"width": 1500, "height": 950})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    page.goto(BASE + PATH)
    page.wait_for_selector(".shell")
    page.evaluate("localStorage.clear()")
    page.reload()
    page.wait_for_selector(".shell")

    tree = explorer(page)

    # ── importing ────────────────────────────────────────────────────────────
    page.set_input_files(".picker", [str(PDF), str(PNG)])
    row = tree.locator('.row[data-kind="file"]', has_text="two-pages")
    row.wait_for(timeout=30000)
    assert tree.locator('.row[data-kind="file"]', has_text="swatch").count() == 1

    listed = page.evaluate("JSON.parse(localStorage.getItem('omnistax-files-v1') || '[]')")
    assert len(listed) == 2, listed
    pdf_id = next(f["id"] for f in listed if f["type"] == "pdf")
    assert next(f for f in listed if f["type"] == "pdf")["pages"] == 2, listed

    # ── the tab, its pages and its text layer ────────────────────────────────
    row.click()
    reader = page.locator(f'.file-tab[data-file="{pdf_id}"]')
    reader.wait_for()
    page.wait_for_selector('.pdf-page[data-page="1"][data-drawn]', timeout=30000)
    assert reader.locator(".pdf-page").count() == 2
    assert "Page 1 of 2" in reader.locator(".bar .where").inner_text()

    # ── a page link out of a note ────────────────────────────────────────────
    page.evaluate(
        "id => localStorage.setItem('omnistax-notedocs-v1', JSON.stringify(["
        "{id:'nnnnnnnn', name:'Reading list', body:'See [[file:'+id+':p2]] for the odd word.',"
        " created:1, updated:1}]))",
        pdf_id,
    )
    page.evaluate(
        "id => { const raw = JSON.parse(localStorage.getItem('omnistax-explorer-v1'));"
        " raw.entries.push({ id:'nnnnnnnn', parent:null, kind:'note', name:'Reading list' });"
        " localStorage.setItem('omnistax-explorer-v1', JSON.stringify(raw)); }",
        pdf_id,
    )
    page.reload()
    page.wait_for_selector(".shell")
    tree = explorer(page)
    tree.locator('.row[data-kind="note"]', has_text="Reading list").click()
    note = page.locator(".note-view")
    note.wait_for()
    note.locator("a.wiki").first.click()
    reader = page.locator(f'.file-tab[data-file="{pdf_id}"]')
    reader.wait_for()
    page.wait_for_selector('.pdf-page[data-page="2"][data-drawn]', timeout=30000)
    page.wait_for_function("() => document.querySelector('.pdf .bar .where')?.textContent?.includes('Page 2')", timeout=10000)

    # ── a highlight on page 2, which survives a reload ───────────────────────
    word = page.locator('.pdf-page[data-page="2"] .textLayer span').first
    word.wait_for()
    word.dblclick()
    bar = page.locator(".hl-bar")
    bar.wait_for()
    bar.locator(".dot.green").click()
    marks = page.evaluate("JSON.parse(localStorage.getItem('omnistax-filemarks-v1') || '[]')")
    assert len(marks) == 1 and marks[0]["kind"] == "highlight" and marks[0]["page"] == 2, marks
    assert len(marks[0]["id"]) == 10, marks

    # A page load lands on its own section, so the file is opened again from
    # its row; it starts at its first page, and page 2 is scrolled back to.
    page.reload()
    page.wait_for_selector(".shell")
    tree = explorer(page)
    tree.locator('.row[data-kind="file"]', has_text="two-pages").click()
    page.wait_for_selector('.pdf-page[data-page="1"][data-drawn]', timeout=30000)
    page.locator('.pdf-page[data-page="2"]').scroll_into_view_if_needed()
    page.wait_for_selector('.pdf-page[data-page="2"][data-drawn]', timeout=30000)
    page.wait_for_selector('.pdf-page[data-page="2"] mark.hl.hl-green', timeout=10000)

    # The Annotations view lists it under Your Files.
    page.get_by_role("button", name="Annotations", exact=True).click()
    annotations = page.locator('.view[data-view="annotations"]')
    annotations.wait_for(state="visible")
    assert annotations.get_by_text("Your Files", exact=False).count() >= 1

    # ── a text box on page 1 ─────────────────────────────────────────────────
    page.locator(f'.file-tab[data-file="{pdf_id}"]').wait_for()
    page.locator(".pdf .bar button", has_text="Text box").click()
    page.locator('.pdf-page[data-page="1"]').click(position={"x": 120, "y": 160})
    page.locator(".text-box").first.wait_for()
    boxes = [m for m in page.evaluate("JSON.parse(localStorage.getItem('omnistax-filemarks-v1') || '[]')") if m["kind"] == "box"]
    assert len(boxes) == 1 and boxes[0]["page"] == 1, boxes

    # ── the search finds a word only the fixture holds ───────────────────────
    page.get_by_role("button", name="Search", exact=True).click()
    search = page.locator('.view[data-view="search"]')
    search.wait_for(state="visible")
    search.locator("input").fill("zyxomni")
    hit = search.locator(".hit", has_text="two-pages")
    hit.first.wait_for(timeout=20000)
    assert "page 2" in hit.first.inner_text()

    # ── the Storage block says how things stand ──────────────────────────────
    page.locator("#gear").click()
    page.locator("#settings").wait_for(state="visible")
    page.get_by_text("This browser's storage").wait_for()
    page.locator("#storage-export").wait_for()

    assert not errors, errors
    print("pdf-browser-check: ok")
    browser.close()
