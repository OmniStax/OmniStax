"""Browser check for the canvas of round two (#34, #33).

Ink drawn in one theme reads in the other; double-clicking empty ground makes
a text card; a connector drawn from a card's handle to another card follows
that card when it moves; a group made round a selection carries it; a note
dropped on the canvas is written in where it stands; a chat dropped on it is
its live tree, and a note holding a whole chat shows that tree inline.

    python3 tests/drawer-canvas-browser-check.py http://127.0.0.1:8093
"""

import sys

from playwright.sync_api import sync_playwright


BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8093").rstrip("/")
TAB = ".pane:not([hidden]) .drawing-tab"

RECORD = """async () => {
    const db = await new Promise((res) => { const r = indexedDB.open('omnistax-drawings', 1); r.onsuccess = () => res(r.result); });
    const all = await new Promise((res) => {
        const tx = db.transaction('drawings', 'readonly');
        const req = tx.objectStore('drawings').getAll();
        req.onsuccess = () => res(req.result);
    });
    db.close();
    return all[0] ?? null;
}"""

PIXEL = """({ selector, x, y }) => {
    const c = document.querySelector(selector);
    const k = c.width / c.getBoundingClientRect().width;
    const d = c.getContext('2d').getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
}"""


SEED = """async () => {
    const m = (id, parent, role, text, at) => ({ id, parent, role, text, chips: [], at, state: 'done' });
    const chat = { id: 'chatchat', name: 'Sky', root: 'r0000000', leaf: 'a2000000', created: 1, updated: 5, messages: {
        r0000000: m('r0000000', null, 'user', '', 1),
        q1000000: m('q1000000', 'r0000000', 'user', 'Why is the sky blue?', 2),
        a1000000: m('a1000000', 'q1000000', 'assistant', 'Scattering.', 3),
        a2000000: m('a2000000', 'q1000000', 'assistant', 'Rayleigh.', 4),
    } };
    const db = await new Promise((res) => {
        const r = indexedDB.open('omnistax-chats', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('chats', { keyPath: 'id' });
        r.onsuccess = () => res(r.result);
    });
    await new Promise((res) => { const tx = db.transaction('chats', 'readwrite'); tx.objectStore('chats').put(chat); tx.oncomplete = res; });
    db.close();
    localStorage.setItem('omnistax-chats-v1', JSON.stringify([{ id: 'chatchat', name: 'Sky', created: 1, updated: 5 }]));
    localStorage.setItem('omnistax-notedocs-v1', JSON.stringify([{ id: 'notenote', name: 'Sky note', body: 'Before.\\n\\n![[chat:chatchat]]', created: 1, updated: 1 }]));
    localStorage.setItem('omnistax-explorer-v1', JSON.stringify({ entries: [{ id: 'notenote', parent: null, kind: 'note', name: 'Sky note' }], expanded: [] }));
}"""


def drop(page, text, x, y):
    page.evaluate(
        """({ selector, text, x, y }) => {
            const el = document.querySelector(selector);
            const data = new DataTransfer();
            data.setData('text/plain', text);
            for (const type of ['dragover', 'drop']) el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, dataTransfer: data }));
        }""",
        {"selector": f"{TAB} .surface", "text": text, "x": x, "y": y},
    )


def items(page, kind):
    page.wait_for_timeout(450)
    return [i for i in page.evaluate(RECORD)["items"] if i["kind"] == kind]


def pixel(page, x, y):
    return page.evaluate(PIXEL, {"selector": f"{TAB} canvas.ink", "x": x, "y": y})


def darkest(page, x, y, r=3):
    """The darkest pixel near a point, so a thin line need not be hit exactly."""
    best = 999
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            p = pixel(page, x + dx, y + dy)
            if p[3] > 0:
                best = min(best, sum(p[:3]) / 3)
    return best


def drag(page, a, b, steps=8):
    page.mouse.move(*a)
    page.mouse.down()
    page.mouse.move(*b, steps=steps)
    page.mouse.up()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--use-gl=swiftshader"])
    page = browser.new_page(viewport={"width": 1500, "height": 950})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)

    page.goto(f"{BASE}/college-physics-2e/ch01/1.1/")
    page.evaluate("localStorage.clear()")
    page.evaluate(SEED)
    page.reload()
    page.wait_for_load_state("networkidle")
    if page.locator('[data-view="explorer"]').count() == 0:
        page.get_by_role("button", name="Explorer", exact=True).click()
        page.wait_for_timeout(300)
    page.get_by_role("button", name="New drawing", exact=True).first.click()
    tab = page.locator(TAB)
    tab.wait_for(state="visible")
    page.keyboard.press("Escape")
    surface = tab.locator(".surface")
    s = surface.bounding_box()
    at = lambda x, y: (s["x"] + x, s["y"] + y)

    # ── #33: ink drawn in the dark reads dark in the light ────────────────
    page.evaluate("document.documentElement.dataset.theme = 'dark'")
    page.wait_for_timeout(200)
    drag(page, at(100, 100), at(200, 100))
    page.evaluate("document.documentElement.dataset.theme = 'light'")
    page.wait_for_timeout(200)
    drag(page, at(100, 160), at(200, 160))
    page.wait_for_timeout(200)
    strokes = items(page, "stroke")
    assert [x["color"] for x in strokes] == ["ink", "ink"], f"ink is stored as a token ({[x['color'] for x in strokes]})"
    assert darkest(page, 150, 100) < 90, "the stroke drawn in the dark resolves to the light ink"
    assert darkest(page, 150, 160) < 90, "and so does the one drawn in the light"
    page.evaluate("document.documentElement.dataset.theme = 'dark'")
    page.wait_for_timeout(300)
    assert darkest(page, 150, 100) > 150, "turning the theme repaints the cached ink"
    page.evaluate("document.documentElement.dataset.theme = 'light'")
    page.wait_for_timeout(200)
    assert tab.locator('.swatch.on[data-token="ink"]').count() == 1, "the selected swatch is the ink token"

    # ── double-click makes a text card and takes back the pen's dots ──────
    page.mouse.dblclick(*at(300, 300))
    page.wait_for_timeout(200)
    assert tab.locator(".text-box textarea").count() == 1, "the new card is open for writing"
    page.keyboard.type("First")
    page.keyboard.press("Escape")
    page.mouse.dblclick(*at(700, 300))
    page.wait_for_timeout(200)
    page.keyboard.type("Second")
    page.keyboard.press("Escape")
    boxes = items(page, "box")
    assert len(boxes) == 2, f"two cards ({len(boxes)})"
    assert len(items(page, "stroke")) == 2, "the clicks of a double-click leave no dots"
    a, b = sorted(boxes, key=lambda x: x["x"])

    # ── a connector from a handle follows its card ────────────────────────
    page.mouse.move(*at(a["x"] + 100, a["y"] + 50))
    page.wait_for_timeout(100)
    handle = tab.locator('.side[data-side="e"]')
    assert handle.count() == 1, "hovering a card shows its handles"
    hb = handle.bounding_box()
    drag(page, (hb["x"] + hb["width"] / 2, hb["y"] + hb["height"] / 2), at(b["x"] + 60, b["y"] + 50))
    links = items(page, "link")
    assert len(links) == 1, "a connector was drawn"
    assert links[0]["from"] == {"item": a["id"], "side": "e"}, links[0]
    assert links[0]["to"].get("item") == b["id"], f"the far end fixed to the second card ({links[0]['to']})"
    side = links[0]["to"]["side"]

    bar = tab.locator(f'[data-box="{b["id"]}"] .bar')
    bb = bar.bounding_box()
    drag(page, (bb["x"] + 20, bb["y"] + bb["height"] / 2), (bb["x"] + 20, bb["y"] + bb["height"] / 2 + 150))
    moved = next(x for x in items(page, "box") if x["id"] == b["id"])
    assert moved["y"] > b["y"] + 100, "the card moved"
    assert items(page, "link")[0]["to"] == {"item": b["id"], "side": side}, "and the connector is still fixed to it"
    ex, ey = {"w": (moved["x"] - 6, moved["y"] + moved["h"] / 2), "n": (moved["x"] + moved["w"] / 2, moved["y"] - 6),
              "s": (moved["x"] + moved["w"] / 2, moved["y"] + moved["h"] + 6), "e": (moved["x"] + moved["w"] + 6, moved["y"] + moved["h"] / 2)}[side]
    assert darkest(page, ex, ey, 5) < 120, "the connector is drawn to where the card now stands"

    # ── a group made round a selection carries it ─────────────────────────
    page.mouse.click(*at(1100, 700))
    page.keyboard.press("l")
    lasso = [(250, 200), (1050, 200), (1050, 650), (250, 650), (250, 205)]
    page.mouse.move(*at(*lasso[0]))
    page.mouse.down()
    for p in lasso[1:]:
        page.mouse.move(*at(*p), steps=4)
    page.mouse.up()
    page.keyboard.press("Control+g")
    groups = items(page, "group")
    assert len(groups) == 1, "Ctrl+G grouped the selection"
    label = tab.locator(".group .label")
    lb = label.bounding_box()
    before = {x["id"]: x for x in items(page, "box")}
    drag(page, (lb["x"] + 10, lb["y"] + 6), (lb["x"] + 10 + 80, lb["y"] + 6 + 40))
    after = {x["id"]: x for x in items(page, "box")}
    for k in before:
        assert abs(after[k]["x"] - before[k]["x"] - 80) < 2 and abs(after[k]["y"] - before[k]["y"] - 40) < 2, "the group carried its cards"

    # ── a swatch recolours the selection ──────────────────────────────────
    page.keyboard.press("Escape")
    tab.locator(f'[data-box="{a["id"]}"] .bar').click()
    tab.locator('.swatch[data-token="ok"]').click()
    assert next(x for x in items(page, "box") if x["id"] == a["id"]).get("color") == "ok", "the card took the colour"

    page.screenshot(path="/home/flober/.claude/jobs/3519a69e/tmp/c34-canvas.png")

    # ── a note on the canvas is written in where it stands ────────────────
    page.keyboard.press("Escape")
    page.keyboard.press("v")
    page.mouse.move(*at(700, 150))
    page.mouse.down(); page.mouse.move(*at(700, -250), steps=4); page.mouse.up()
    page.keyboard.press("p")
    drop(page, "![[Sky note]]", *at(80, 80))
    frame = tab.locator('.frame[data-embed="Sky note"]')
    frame.wait_for(state="visible")
    frame.dblclick()
    frame.locator(".cm-content").wait_for(state="visible")
    page.keyboard.press("Control+End")
    page.keyboard.type(" Typed here.")
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    assert frame.locator(".cm-content").count() == 0, "Escape leaves the editor"
    body = page.evaluate("JSON.parse(localStorage.getItem('omnistax-notedocs-v1'))[0].body")
    assert "Typed here." in body, f"the frame wrote to the note itself ({body!r})"
    assert len(items(page, "stroke")) == 3, "typing in the frame laid no ink and picked no tool"

    # ── a chat dropped on the canvas is its live tree ─────────────────────
    drop(page, "![[chat:chatchat]]", *at(500, 80))
    chat = tab.locator('.chat-item[data-chat="chatchat"]')
    chat.wait_for(state="visible")
    assert len(items(page, "chat")) == 1, "the drop is one chat item"
    chat.locator("[data-node]").first.wait_for(state="visible")
    assert chat.locator("[data-node]").count() == 3, "the tree holds every message"
    page.screenshot(path="/home/flober/.claude/jobs/3519a69e/tmp/c34-chat.png")

    # ── a note holding a whole chat shows the tree inline ─────────────────
    if page.locator('[data-view="explorer"]').count() == 0:
        page.get_by_role("button", name="Explorer", exact=True).click()
    page.locator('.row[data-kind="note"]').first.click()
    tree = page.locator(".pane:not([hidden]) .note-view .chat-tree")
    tree.wait_for(state="visible")
    tree.locator("[data-node]").first.wait_for(state="visible")
    assert tree.locator("[data-node]").count() == 3, "the note's chat embed is the tree"
    assert 200 < tree.bounding_box()["height"] < 320, "at a fixed height"
    page.screenshot(path="/home/flober/.claude/jobs/3519a69e/tmp/c34-note.png")
    assert not errors, f"console errors: {errors}"
    print("drawer canvas browser check: ok")
    browser.close()
