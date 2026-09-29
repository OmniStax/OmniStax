"""Production-build browser checks for the pomodoro panel and its stats.

Run against a served ``dist`` directory, e.g.:
    python3 tests/pomodoro-browser-check.py http://127.0.0.1:4337 [shots-dir]
"""

import json
import pathlib
import sys
import time
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4337").rstrip("/")
SHOTS = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp")
PATH = "/college-physics-2e/ch01/1.1/"
DAY = 86_400_000


def old_log(now_ms):
    return [
        {"id": f"e{i}", "start": now_ms - (i + 1) * DAY, "end": now_ms - (i + 1) * DAY + 1_500_000,
         "minutes": 25, "summary": f"old {i}", "completed": True, "mode": "pomodoro", "categories": ["c1"]}
        for i in range(30)
    ]


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--use-gl=swiftshader"])
    context = browser.new_context(device_scale_factor=1.25, viewport={"width": 1300, "height": 850})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE + PATH)
    page.wait_for_selector(".shell")
    now_ms = page.evaluate("Date.now()")
    page.evaluate(f"""
      localStorage.setItem('omnistax-pomodoros', {json.dumps(json.dumps(old_log(now_ms)))});
      localStorage.setItem('omnistax-pomodoro-categories', JSON.stringify([{{id:'c1',name:'Mechanics',color:'#4b8fd6'}}]));
      localStorage.setItem('omnistax-pomodoro-lock', '1');
    """)
    page.reload()
    page.wait_for_selector(".shell")
    page.get_by_role("button", name="Pomodoro", exact=True).first.click()
    page.wait_for_selector(".pom .face")

    # (1) At a fractional pixel ratio the face's last row and column are cleared each frame:
    # drifting segments cross the edge, but no edge pixel stays lit through every sample.
    edge_js = """() => {
      const c = document.querySelector('.pom .face canvas'); const x = c.getContext('2d');
      const w = c.width, h = c.height;
      const px = [...x.getImageData(w - 1, 0, 1, h).data, ...x.getImageData(0, h - 1, w, 1).data];
      return px.flatMap((v, i) => (i % 4 === 3 && v > 0 ? [i] : []));
    }"""
    time.sleep(2)
    lit = None
    for _ in range(5):
        now_lit = set(page.evaluate(edge_js))
        lit = now_lit if lit is None else lit & now_lit
        time.sleep(1.5)
    page.locator(".pom .face").screenshot(path=str(SHOTS / "pomo-face.png"), scale="device")
    assert len(lit) < 3, f"edge pixels never cleared: {len(lit)}"

    # (5) Add from the sidebar: the day defaults to today.
    page.locator(".pom .add").click()
    ed = page.locator(".pom form.editor")
    assert ed.get_by_label("Day").input_value() == page.evaluate("(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()")
    ed.get_by_label("From").fill("00:10")
    ed.get_by_label("To").fill("00:40")
    ed.get_by_label("Summary").fill("sidebar entry")
    ed.get_by_role("button", name="Add").click()
    page.locator(".pom .sessions li", has_text="sidebar entry").wait_for()
    assert "30m" in page.locator(".pom .sessions li").first.inner_text()

    # Inline edit in the sidebar, through the row menu.
    row = page.locator(".pom .sessions li", has_text="sidebar entry")
    row.hover()
    row.get_by_label("Actions for this session").click()
    page.get_by_role("menuitem", name="Edit").click()
    page.locator(".pom .sessions form.editor").get_by_label("Summary").fill("edited entry")
    page.locator(".pom .sessions form.editor").get_by_role("button", name="Save").click()
    page.locator(".pom .sessions li", has_text="edited entry").wait_for()
    page.screenshot(path=str(SHOTS / "pomo-sidebar.png"))

    # (4) The row menu closes on an outside click and on Escape.
    row = page.locator(".pom .sessions li", has_text="edited entry")
    row.hover()
    row.get_by_label("Actions for this session").click()
    assert page.get_by_role("menuitem", name="Edit").is_visible()
    page.mouse.click(700, 400)
    assert page.get_by_role("menu").count() == 0, "menu stays open after an outside click"
    row.hover()
    row.get_by_label("Actions for this session").click()
    page.keyboard.press("Escape")
    assert page.get_by_role("menu").count() == 0, "menu stays open after Escape"

    # (2) Screen lock: leaving the window washes the page red and counts down; coming back clears it.
    page.get_by_role("button", name="Start", exact=True).click()
    page.evaluate("document.documentElement.dispatchEvent(new PointerEvent('pointerleave', { relatedTarget: null }))")
    wash = page.locator(".wash")
    wash.wait_for()
    first = wash.inner_text()
    assert "Session failing in" in first, first
    time.sleep(1.3)
    second = wash.inner_text()
    assert first != second, (first, second)
    page.screenshot(path=str(SHOTS / "pomo-wash.png"))
    page.evaluate("document.documentElement.dispatchEvent(new PointerEvent('pointerenter'))")
    wash.wait_for(state="detached")
    page.get_by_role("button", name="Stop", exact=True).click()

    # (7) The stats list: newest first, 25 to a page.
    page.get_by_role("button", name="More Stats →").click()
    stats = page.locator(".stats")
    stats.wait_for()
    assert stats.locator(".pager").inner_text().count("Page 1 of 2") == 1
    assert stats.locator(".rows > li").count() == 25
    assert "edited entry" in stats.locator(".rows > li").first.inner_text()
    stats.get_by_role("button", name="Older →").click()
    assert "Page 2 of 2" in stats.locator(".pager").inner_text()
    assert stats.locator(".rows > li").count() == 6

    # (3) Add from the stats list.
    stats.get_by_role("button", name="+ Add session").click()
    sed = stats.locator("form.editor")
    sed.get_by_label("From").fill("00:00")
    sed.get_by_label("To").fill("00:05")
    sed.get_by_label("Summary").fill("stats entry")
    sed.get_by_role("button", name="Add").click()
    stats.locator(".rows > li", has_text="stats entry").wait_for()

    # (6) Categories: a menu with Edit and Delete Category, closing on an outside click.
    stats.get_by_role("tab", name="Category").click()
    stats.get_by_label("Actions for Mechanics").click()
    assert page.get_by_role("menuitem", name="Delete Category").is_visible()
    page.mouse.click(700, 60)
    assert page.get_by_role("menu").count() == 0
    stats.get_by_label("Actions for Mechanics").click()
    page.get_by_role("menuitem", name="Delete Category").click()
    assert stats.get_by_text("Delete?").is_visible()
    page.screenshot(path=str(SHOTS / "pomo-stats.png"))

    assert not errors, errors
    browser.close()
    print("pomodoro browser check passed")
