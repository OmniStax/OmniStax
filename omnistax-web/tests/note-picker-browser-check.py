"""Browser check for the `[[` picker in the note editor.

    python3 -m http.server -d dist 8093 &
    python3 tests/note-picker-browser-check.py http://127.0.0.1:8093

The chat composer's `@` and this are the same list, and the chat check covers
the composer; what is peculiar here is that the list stands inside CodeMirror,
whose own keymap would take Enter and the arrows first if it were asked first,
and that it hangs by the cursor rather than by the foot of a field.
"""

import sys

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8093").rstrip("/")

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

    # A new note opens on its writing side, with the cursor in it.
    page.locator("#palette-btn").click()
    page.locator(".palette").wait_for(state="visible")
    page.keyboard.type("New note")
    page.wait_for_timeout(400)
    page.keyboard.press("Enter")
    page.wait_for_timeout(1500)
    editor = page.locator(".md-editor .cm-content").first
    editor.wait_for(state="visible")
    editor.click()
    page.wait_for_timeout(200)

    body = lambda: page.evaluate('document.querySelector(".md-editor .cm-content").textContent')
    picker = page.locator(".md-editor .picker")
    rows = lambda: page.eval_on_selector_all(".md-editor .picker li button", "bs=>bs.map(b=>b.innerText)")

    # A second `[` closes the pair and opens the list, quickly.
    page.keyboard.type("See ")
    page.evaluate("() => { window.__t0 = performance.now(); }")
    page.keyboard.type("[[")
    picker.wait_for(state="visible")
    opened = page.evaluate("() => performance.now() - window.__t0")
    print(f"the note's picker opened in {opened:.0f} ms")
    assert opened < 100, f"the picker took {opened:.0f} ms to open"
    assert rows() == ["OmniBooks", "Files"], rows()

    # Enter walks into a node — CodeMirror's own keymap must not have made a
    # line of it — and what is typed next searches below it.
    page.keyboard.press("Enter")
    page.wait_for_timeout(250)
    assert picker.count() == 1, "Enter closed the list instead of walking into the node"
    assert "OmniBooks" in picker.locator(".crumb").inner_text(), picker.locator(".crumb").inner_text()
    page.keyboard.type("1.2")
    page.wait_for_timeout(400)
    assert rows()[0].startswith("1.2 ·"), rows()

    # Enter on a row writes the link over what was typed.
    page.keyboard.press("Enter")
    page.wait_for_timeout(400)
    assert picker.count() == 0, "the list stayed open"
    assert body() == "See [[college-physics-2e/1.2]]", body()

    # Enter takes a section row whole, as it takes a leaf.
    page.keyboard.type(" and [[")
    picker.wait_for(state="visible")
    page.keyboard.type("3.1")
    page.wait_for_timeout(400)
    assert rows()[0].startswith("3.1 ·"), rows()
    page.keyboard.press("Enter")
    page.wait_for_timeout(400)
    assert body() == "See [[college-physics-2e/1.2]] and [[college-physics-2e/3.1]]", body()

    assert not errors, errors
    print("note picker browser check passed")
    browser.close()
