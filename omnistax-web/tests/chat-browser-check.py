"""Browser check for the chat tab, against the mock provider beside it.

    python3 tests/mock-openai.py 8094 &
    python3 -m http.server -d dist 8093 &
    python3 tests/chat-browser-check.py http://127.0.0.1:8093 http://127.0.0.1:8094
"""

import json
import sys

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8093").rstrip("/")
MOCK = (sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8094").rstrip("/")

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

    # Settings: a Local AI endpoint is added, its models are fetched, and the
    # first is ticked for the menu.
    page.get_by_role("button", name="Settings", exact=True).click()
    dialog = page.locator("#settings")
    local = dialog.locator("[data-ai-card='local']")
    local.scroll_into_view_if_needed()
    local.get_by_label("New endpoint name").fill("Mock")
    local.get_by_label("New endpoint URL").fill(MOCK)
    local.get_by_role("button", name="Add endpoint").click()
    local.get_by_label("mock-1").wait_for(state="visible", timeout=10_000)
    local.get_by_label("mock-1").check()
    assert dialog.locator("[data-ai-card='anthropic'] a", has_text="Get a key").get_attribute("href").startswith("https://console.anthropic.com")
    assert dialog.get_by_label("Inline HTML rendering").is_checked(), "inline HTML is on by default"
    page.keyboard.press("Escape")
    dialog.wait_for(state="hidden")

    # The rail opens Conversations, and "New chat" there opens a chat.
    page.locator(".rail").get_by_role("button", name="Conversations", exact=True).click()
    page.locator(".conversations").get_by_role("button", name="New chat").click()
    chat = page.locator(".chat-tab").first
    chat.wait_for(state="visible")

    # The section being read is pinned as the first chip, and it can be removed.
    composer = chat.locator(".composer")
    chips = composer.locator(".chips li")
    chips.first.wait_for(state="visible")
    assert "1.1" in chips.first.inner_text(), chips.first.inner_text()

    # The model menu: a model without a key says so, and the endpoint's model
    # is chosen.
    composer.locator(".menu .current").click()
    menu = composer.locator(".menu .pop")
    menu.wait_for(state="visible")
    assert menu.get_by_text("Needs key").count() > 0, "a keyless model says so"
    menu.get_by_role("menuitemradio", name="mock-1 · Mock").click()
    assert "mock-1" in composer.locator(".menu .current").inner_text()

    field = composer.locator("textarea")
    field.fill("Why does the period not depend on the mass?")
    composer.get_by_role("button", name="Send").click()

    answer = chat.locator(".bubble[data-role='assistant'] .answer").first
    answer.wait_for(state="visible")
    page.wait_for_function("() => document.querySelector('.bubble[data-role=\"assistant\"]')?.dataset.state === 'done'", timeout=15_000)
    text = answer.inner_text()
    assert "mass cancels" in text, text
    # The answer is rendered with the note renderer: the maths is set and the
    # link into the book is a link, not four brackets.
    assert answer.locator(".katex").count() > 0, "the maths was not set"
    assert answer.locator("a.wiki, .wiki.dead").count() > 0, "the section link was not resolved"
    assert "mock-1" in chat.locator(".bubble[data-role='assistant'] .role").first.inner_text().lower()

    # A tool call: the mock asks for list_books, the app runs it and sends the
    # result back, and the bubble shows one collapsed line for the step.
    field.fill("Answer with a tool, please.")
    composer.get_by_role("button", name="Send").click()
    page.wait_for_function("() => [...document.querySelectorAll('.bubble[data-role=\"assistant\"]')].at(-1)?.dataset.state === 'done'", timeout=15_000)
    last = chat.locator(".bubble[data-role='assistant']").last
    step = last.locator(".steps summary")
    assert step.count() == 1 and "Listed the books" in step.inner_text(), step.all_inner_texts()
    assert "shelf holds" in last.locator(".answer").inner_text(), last.locator(".answer").inner_text()
    step.click()
    assert "college-physics-2e" in last.locator(".steps .io").last.inner_text()

    # Retry asks again beside the answer that stands.
    last.get_by_role("button", name="Retry").click()
    page.wait_for_function("() => document.querySelector('.bubble[data-role=\"assistant\"] .pager .count')", timeout=15_000)

    # The chat is kept: its index is in localStorage and its record in IndexedDB,
    # the tool steps and the model chosen with it.
    index = page.evaluate("JSON.parse(localStorage.getItem('omnistax-chats-v1') || '[]')")
    assert len(index) == 1 and index[0]["name"], index
    kept = page.evaluate(
        """async () => new Promise((resolve) => {
            const open = indexedDB.open('omnistax-chats', 1);
            open.onsuccess = () => {
              const all = open.result.transaction('chats', 'readonly').objectStore('chats').getAll();
              all.onsuccess = () => resolve(all.result.map((c) => ({ n: Object.keys(c.messages).length, pick: c.pick, steps: Object.values(c.messages).some((m) => m.steps) })));
            };
          })"""
    )
    assert kept and kept[0]["n"] >= 5 and kept[0]["steps"] and kept[0]["pick"]["provider"] == "local", kept

    # The keys stay in this browser where the reader put them.
    stored = page.evaluate("JSON.parse(localStorage.getItem('omnistax-ai-v1'))")
    page.evaluate("([k, v]) => localStorage.setItem(k, v)", ["omnistax-ai-v1", json.dumps({**stored, "keys": {**stored["keys"], "openai": "sk-secret"}})])
    page.reload()
    page.wait_for_load_state("networkidle")
    stored = page.evaluate("JSON.parse(localStorage.getItem('omnistax-ai-v1'))")
    assert stored["keys"]["openai"] == "sk-secret", stored

    # Ask AI on a selection pastes the words into the chat's composer.
    page.evaluate(
        """() => {
            const p = document.querySelector('.pane:not([hidden]) article[data-doc] p');
            const range = document.createRange();
            range.selectNodeContents(p);
            const sel = document.getSelection(); sel.removeAllRanges(); sel.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
          }"""
    )
    page.get_by_role("button", name="Ask AI about this").click()
    quoted = page.locator(".chat-tab .composer textarea").first
    quoted.wait_for(state="visible")
    page.wait_for_function("() => document.querySelector('.chat-tab .composer textarea').value.startsWith('>')", timeout=10_000)

    # ── the @ picker ──────────────────────────────────────────────────────
    # Sections of three chapters are opened first, because the picker's rows are
    # read out of every section that is loaded and that is where it used to go
    # slow: the rows were gathered again on every keystroke and on every word of
    # an answer arriving.
    # The Open browser stands in the chapter being read, so Left widens it to
    # the book, a word of the chapter's title narrows it again, and Right steps
    # in; the same two keys then step from the section to its text.
    def open_section(chapter: str, sec: str) -> None:
        page.locator(".tabstrip .plus").first.click()
        page.locator(".browser").wait_for(state="visible")
        page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(250)
        page.keyboard.type(chapter)
        page.wait_for_timeout(250)
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(350)
        page.keyboard.type(sec)
        page.wait_for_timeout(250)
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(250)
        page.keyboard.press("Enter")
        page.wait_for_timeout(1200)

    for chapter, sec in (("Nature of Science", "1.2"), ("Nature of Science", "1.3"),
                         ("Kinematics", "2.1"), ("Kinematics", "2.2"),
                         ("Two-Dimensional", "3.1"), ("Two-Dimensional", "3.2")):
        open_section(chapter, sec)
    loaded = page.locator("article[data-doc]").count()
    assert loaded >= 6, f"only {loaded} sections were opened"

    page.locator(".rail").get_by_role("button", name="Conversations", exact=True).click()
    page.locator(".conversations").get_by_role("button", name="New chat").click()
    chat = page.locator(".chat-tab:visible").first
    composer = chat.locator(".composer")
    chips = composer.locator(".chips li")
    field = composer.locator("textarea")


    field.click()
    field.fill("")
    page.evaluate("() => { window.__t0 = performance.now(); }")
    page.keyboard.type("@")
    picker = composer.locator(".picker")
    picker.wait_for(state="visible")
    opened = page.evaluate("() => performance.now() - window.__t0")
    print(f"the picker opened in {opened:.0f} ms with {loaded} sections loaded")
    assert opened < 100, f"the picker took {opened:.0f} ms to open"

    page.keyboard.press("Escape")
    field.fill("")

    # With inline HTML rendering on, a block tagged `widget` is the page it
    # holds, in a sandbox that cannot reach this one.
    field.fill("Please draw a widget.")
    composer.get_by_role("button", name="Send").click()
    frame = chat.locator(".bubble .widget iframe").first
    frame.wait_for(state="visible", timeout=15_000)
    assert frame.get_attribute("sandbox") == "allow-scripts", frame.get_attribute("sandbox")

    assert not errors, errors
    print("chat browser check passed")
    browser.close()
