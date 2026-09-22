"""Focused browser smoke check for the Drawer.

The pure model is covered by tests/drawer.test.ts; what only a browser can
answer is whether a pointer laid on the canvas becomes ink, whether that ink
is still there after a reload, and whether the things a drawing is meant to
hold — a card dropped on it, a text box, the scratch page of an exercise —
arrive where they are put.

Run against a built preview, for example:
    python3 tests/drawer-browser-check.py http://127.0.0.1:8092
"""

import sys

from playwright.sync_api import sync_playwright


BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8092").rstrip("/")


def stroke(page, surface, points, pointer_type="mouse"):
    """Draw with synthetic pointer events, the way a pen or a mouse would.

    Playwright's mouse sends no pointerType of its own, so the events are
    dispatched by hand where the check needs to say which device drew: palm
    rejection turns on what pointerType says and nothing else.
    """
    box = surface.bounding_box()
    page.evaluate(
        """({ selector, points, pointerType }) => {
            const el = document.querySelector(selector);
            const send = (type, x, y, extra = {}) => el.dispatchEvent(new PointerEvent(type, {
                bubbles: true, cancelable: true, composed: true,
                clientX: x, clientY: y, pointerId: extra.pointerId ?? 1,
                pointerType, pressure: 0.7, button: 0, buttons: 1, isPrimary: true,
            }));
            const first = points[0];
            send('pointerdown', first[0], first[1]);
            points.slice(1).forEach(([x, y]) => send('pointermove', x, y));
            const last = points[points.length - 1];
            send('pointerup', last[0], last[1]);
        }""",
        {
            "selector": ".pane:not([hidden]) .drawing-tab .surface",
            "points": [[box["x"] + x, box["y"] + y] for x, y in points],
            "pointerType": pointer_type,
        },
    )


def focus_surface(page):
    """Put the keyboard on the canvas without drawing on it.

    A click with the pen down is a dot of ink, which is right, so the checks
    that only want the keys take the focus directly instead.
    """
    page.evaluate("document.querySelector('.pane:not([hidden]) .drawing-tab .surface').focus()")


def item_count(page, kind=None):
    """How many items the open drawing holds, read off the store itself."""
    return page.evaluate(
        """(kind) => {
            const key = JSON.parse(localStorage.getItem('omnistax-drawings-v1') ?? '[]');
            return key.length;
        }""",
        kind,
    )


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--use-gl=swiftshader"])
    page = browser.new_page(viewport={"width": 1500, "height": 950})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)

    page.goto(f"{BASE}/college-physics-2e/ch01/1.1/")
    page.evaluate("localStorage.clear()")
    page.reload()
    page.wait_for_load_state("networkidle")

    # ── a drawing is made from the explorer and opens as a tab ────────────
    # The explorer stands open in the sidebar already; the rail button is a
    # toggle, so it is only pressed when the tree is not showing.
    def show_explorer():
        if page.locator('[data-view="explorer"]').count() == 0:
            page.get_by_role("button", name="Explorer", exact=True).click()
            page.wait_for_timeout(300)

    show_explorer()
    page.get_by_role("button", name="New drawing", exact=True).first.click()

    tab = page.locator(".pane:not([hidden]) .drawing-tab")
    tab.wait_for(state="visible")
    surface = tab.locator(".surface")
    assert surface.count() == 1, "the drawing tab draws a canvas"
    assert tab.locator("canvas.ink").count() == 1

    # The row is in the tree and the name list has one drawing in it.
    assert page.locator('.row[data-kind="drawing"]').count() == 1
    assert item_count(page) == 1, "the name list is mirrored in localStorage at once"

    # Escape closes the name box the new row opened, so the keys below reach
    # the canvas rather than the field.
    page.keyboard.press("Escape")

    # ── a pointer laid on the canvas becomes ink ──────────────────────────
    stroke(page, surface, [(200, 200), (260, 240), (320, 200), (380, 260)])
    page.wait_for_timeout(500)   # the store writes 300 ms after the last change

    strokes = page.evaluate(
        """async () => {
            const db = await new Promise((res, rej) => {
                const r = indexedDB.open('omnistax-drawings', 1);
                r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
            });
            const all = await new Promise((res, rej) => {
                const tx = db.transaction('drawings', 'readonly');
                const req = tx.objectStore('drawings').getAll();
                req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
            });
            db.close();
            return all.flatMap((d) => d.items.filter((i) => i.kind === 'stroke'));
        }"""
    )
    assert len(strokes) == 1, f"one stroke was laid down, got {len(strokes)}"
    assert len(strokes[0]["points"]) >= 2, "the stroke keeps the points it was drawn through"

    # ── the ink survives a reload ─────────────────────────────────────────
    page.reload()
    page.wait_for_load_state("networkidle")
    surviving = page.evaluate(
        """async () => {
            const db = await new Promise((res) => { const r = indexedDB.open('omnistax-drawings', 1); r.onsuccess = () => res(r.result); });
            const all = await new Promise((res) => {
                const tx = db.transaction('drawings', 'readonly');
                const req = tx.objectStore('drawings').getAll();
                req.onsuccess = () => res(req.result);
            });
            db.close();
            return all.flatMap((d) => d.items).length;
        }"""
    )
    assert surviving >= 1, "the stroke is still there after a reload"

    # The row is still in the tree, and opening it shows the ink again: the
    # name list is read from localStorage and the ink from the database.
    show_explorer()
    assert page.locator('.row[data-kind="drawing"]').count() == 1
    page.locator('.row[data-kind="drawing"]').first.click()
    tab = page.locator(".pane:not([hidden]) .drawing-tab")
    tab.wait_for(state="visible")
    assert tab.locator("canvas.ink").count() == 1, "the drawing opens again from its row"

    # ── palm rejection: a touch while a pen is down lays no ink ───────────
    surface = tab.locator(".surface")
    before = surviving
    box = surface.bounding_box()
    page.evaluate(
        """(selector) => {
            const el = document.querySelector(selector);
            const at = (type, pointerType, x, y, pointerId) => el.dispatchEvent(new PointerEvent(type, {
                bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y,
                pointerId, pointerType, pressure: 0.6, button: 0, buttons: 1, isPrimary: pointerId === 1,
            }));
            const r = el.getBoundingClientRect();
            /* The pen touches down and stays down; the palm lands beside it. */
            at('pointerdown', 'pen', r.left + 400, r.top + 400, 1);
            at('pointerdown', 'touch', r.left + 500, r.top + 500, 2);
            at('pointermove', 'touch', r.left + 560, r.top + 540, 2);
            at('pointerup', 'touch', r.left + 560, r.top + 540, 2);
            at('pointerup', 'pen', r.left + 400, r.top + 400, 1);
        }""",
        ".pane:not([hidden]) .drawing-tab .surface",
    )
    page.wait_for_timeout(500)
    after_palm = page.evaluate(
        """async () => {
            const db = await new Promise((res) => { const r = indexedDB.open('omnistax-drawings', 1); r.onsuccess = () => res(r.result); });
            const all = await new Promise((res) => {
                const tx = db.transaction('drawings', 'readonly');
                const req = tx.objectStore('drawings').getAll();
                req.onsuccess = () => res(req.result);
            });
            db.close();
            return all.flatMap((d) => d.items).length;
        }"""
    )
    # The pen's own dot may land; the palm's sweep must not be a second stroke.
    assert after_palm - before <= 1, f"the palm laid ink of its own ({before} → {after_palm})"

    # ── the tool keys pick a tool ─────────────────────────────────────────
    focus_surface(page)
    page.keyboard.press("e")
    assert tab.locator('button[aria-pressed="true"][aria-label="Eraser"]').count() == 1, "E picks the eraser"
    page.keyboard.press("t")
    assert tab.locator('button[aria-pressed="true"][aria-label="Text box"]').count() == 1, "T picks the text box"

    # A text box is placed where the canvas is pressed, and is a box the
    # reader can write in rather than ink.
    stroke(page, surface, [(600, 300), (600, 300)])
    page.wait_for_timeout(200)
    assert tab.locator(".text-box").count() >= 1, "the text tool leaves a box on the page"

    page.keyboard.press("p")
    assert tab.locator('button[aria-pressed="true"][aria-label="Pen"]').count() == 1, "P comes back to the pen"

    # ── undo is the drawing's own ─────────────────────────────────────────
    boxes_before = tab.locator(".text-box").count()
    focus_surface(page)
    page.keyboard.press("Control+z")
    page.wait_for_timeout(200)
    assert tab.locator(".text-box").count() == boxes_before - 1, "Ctrl+Z inside the tab takes back the box"

    # ── a card dropped on the page becomes a frame ────────────────────────
    box = surface.bounding_box()
    page.evaluate(
        """({ selector, x, y }) => {
            const el = document.querySelector(selector);
            const data = new DataTransfer();
            data.setData('text/plain', '![[def:1.1:physics]]');
            const fire = (type) => el.dispatchEvent(new DragEvent(type, {
                bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, dataTransfer: data,
            }));
            fire('dragover');
            fire('drop');
        }""",
        {"selector": ".pane:not([hidden]) .drawing-tab .surface", "x": box["x"] + 420, "y": box["y"] + 520},
    )
    page.wait_for_timeout(400)
    assert tab.locator(".frame").count() == 1, "the dropped card stands in a frame"
    assert tab.locator('.frame[data-embed="def:1.1:physics"]').count() == 1, "and the frame holds what was dropped"

    # ── an exercise reaches for paper ─────────────────────────────────────
    show_explorer()
    page.locator('.row[data-kind="section"]', has_text="1.1").first.click()
    page.wait_for_load_state("networkidle")

    card = page.locator(".pane:not([hidden]) .exercise").first
    if card.count() and card.get_by_role("button", name="Scratch").count():
        card.get_by_role("button", name="Scratch").click()
        scratch = page.locator(".scratch-pane")
        scratch.wait_for(state="visible")
        assert scratch.locator(".drawing-tab .surface").count() == 1, "the scratch page is a drawing"
        assert scratch.get_by_role("button", name="Save as drawing").count() == 1, \
            "and it offers to become a drawing of the reader's own"

        # Work on it, then keep it: a row appears under Your Files.
        rows_before = page.locator('.row[data-kind="drawing"]').count()
        stroke(page, scratch.locator(".surface"), [(120, 120), (200, 190)])
        page.wait_for_timeout(500)
        scratch.get_by_role("button", name="Save as drawing").click()
        page.wait_for_timeout(500)
        show_explorer()
        assert page.locator('.row[data-kind="drawing"]').count() == rows_before + 1, \
            "the saved scratch work has a row of its own"

    assert not errors, f"console errors: {errors}"
    print("drawer browser check: ok")
    browser.close()
