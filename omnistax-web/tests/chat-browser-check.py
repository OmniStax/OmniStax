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

# The reader has chosen a host of their own that speaks OpenAI's shape: no key,
# a base URL, and a model name the mock answers to.
AI = {
    "provider": "compatible",
    "models": {"anthropic": "", "openai": "", "gemini": "", "compatible": "mock-1"},
    "baseUrl": MOCK,
    "keys": {"anthropic": "", "openai": "", "gemini": "", "compatible": ""},
}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--use-gl=swiftshader"])
    page = browser.new_page(viewport={"width": 1500, "height": 950})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)

    page.goto(f"{BASE}/college-physics-2e/ch01/1.1/")
    page.evaluate("localStorage.clear()")
    page.evaluate("([k, v]) => localStorage.setItem(k, v)", ["omnistax-ai-v1", json.dumps(AI)])
    page.reload()
    page.wait_for_load_state("networkidle")

    # The rail opens a chat of its own in a split, and every click opens another.
    page.get_by_role("button", name="New chat", exact=True).click()
    chat = page.locator(".chat-tab").first
    chat.wait_for(state="visible")

    # The section being read is pinned as the first chip, and it can be removed.
    composer = chat.locator(".composer")
    chips = composer.locator(".chips li")
    chips.first.wait_for(state="visible")
    assert "1.1" in chips.first.inner_text(), chips.first.inner_text()

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

    # Edit and resend makes a sibling, and the pager says so.
    said = chat.locator(".bubble[data-role='user']").first
    said.get_by_role("button", name="Edit").click()
    said.locator("textarea").fill("What if the string were twice as long?")
    said.get_by_role("button", name="Send again").click()
    page.wait_for_function("() => document.querySelectorAll('.bubble[data-role=\"user\"] .pager .count').length > 0", timeout=15_000)
    assert "2 of 2" in chat.locator(".bubble[data-role='user'] .pager .count").first.inner_text()
    # The fork is on the breadcrumb, and both branches are named in the list.
    assert chat.locator(".crumbs .crumb").count() == 1
    chat.get_by_role("button", name="Branches").click()
    assert chat.locator(".leaves li").count() == 2

    # Retry asks again beside the answer that stands.
    page.wait_for_function("() => document.querySelectorAll('.bubble[data-role=\"assistant\"][data-state=\"done\"]').length > 0", timeout=15_000)
    chat.locator(".bubble[data-role='assistant']").first.get_by_role("button", name="Retry").click()
    page.wait_for_function("() => document.querySelector('.bubble[data-role=\"assistant\"] .pager .count')", timeout=15_000)

    # The chat is kept: its index is in localStorage and its record in IndexedDB.
    index = page.evaluate("JSON.parse(localStorage.getItem('omnistax-chats-v1') || '[]')")
    assert len(index) == 1 and index[0]["name"], index
    kept = page.evaluate(
        """async () => new Promise((resolve) => {
            const open = indexedDB.open('omnistax-chats', 1);
            open.onsuccess = () => {
              const all = open.result.transaction('chats', 'readonly').objectStore('chats').getAll();
              all.onsuccess = () => resolve(all.result.map((c) => Object.keys(c.messages).length));
            };
          })"""
    )
    assert kept and kept[0] >= 5, kept

    # A backup carries the chats and leaves the keys behind.
    page.evaluate("([k, v]) => localStorage.setItem(k, v)", ["omnistax-ai-v1", json.dumps({**AI, "keys": {**AI["keys"], "openai": "sk-secret"}})])
    page.reload()
    page.wait_for_load_state("networkidle")
    # The exporter is what strips the key (tests/chat.test.ts covers that); what
    # is checked here is that the browser keeps it where the reader put it.
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
                         ("2 Kinematics", "2.1"), ("2 Kinematics", "2.2"),
                         ("Two-Dimensional", "3.1"), ("Two-Dimensional", "3.2")):
        open_section(chapter, sec)
    loaded = page.locator("article[data-doc]").count()
    assert loaded >= 6, f"only {loaded} sections were opened"

    field.click()
    field.fill("")
    page.evaluate("() => { window.__t0 = performance.now(); }")
    page.keyboard.type("@")
    picker = composer.locator(".picker")
    picker.wait_for(state="visible")
    opened = page.evaluate("() => performance.now() - window.__t0")
    print(f"the picker opened in {opened:.0f} ms with {loaded} sections loaded")
    assert opened < 100, f"the picker took {opened:.0f} ms to open"

    # Enter on a category goes into it, and what is typed next narrows its rows
    # rather than being read as the name of a category again.
    assert picker.locator("li button").first.inner_text().startswith("Notes"), picker.locator("li button").first.inner_text()
    page.keyboard.type("sections")
    page.wait_for_timeout(200)
    assert picker.locator("li button").count() == 1, "one category is named"
    page.keyboard.press("Enter")
    page.wait_for_timeout(200)
    assert "Sections" in picker.locator(".crumb").inner_text(), picker.locator(".crumb").inner_text()
    page.keyboard.type("1.2")
    page.wait_for_timeout(200)
    named = [picker.locator("li button").nth(i).inner_text() for i in range(picker.locator("li button").count())]
    assert named and all("1.2" in row for row in named), named
    assert named[0].startswith("1.2 ·"), named[0]

    # Enter on a row cuts the `@…` from the field and puts a chip up instead.
    before = chips.count()
    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    assert picker.count() == 0, "the picker stayed open"
    assert field.input_value() == "", field.input_value()
    assert chips.count() == before + 1, f"{chips.count()} chips, was {before}"
    assert "1.2" in chips.last.inner_text(), chips.last.inner_text()

    # And a click on a row does the same, though the press moves the focus off
    # the field: it is taken on the press, with the default refused.
    page.keyboard.type("@sections")
    picker.wait_for(state="visible")
    page.keyboard.press("Enter")
    page.wait_for_timeout(200)
    page.keyboard.type("3.1")
    page.wait_for_timeout(200)
    picker.locator("li button").first.click()
    page.wait_for_timeout(300)
    assert picker.count() == 0, "the picker stayed open after a click"
    assert field.input_value() == "", field.input_value()
    assert "3.1" in chips.last.inner_text(), chips.last.inner_text()

    # The picker closes and leaves nothing behind.
    for chip in range(chips.count() - 1, 0, -1):
        chips.nth(chip).locator("button").click()
    page.wait_for_timeout(200)

    # A widget is opt-in per chat: with the toggle on, a block tagged `widget`
    # is the page it holds, in a sandbox that cannot reach this one.
    composer.get_by_role("button", name="Widgets off").click()
    field.fill("Please draw a widget.")
    composer.get_by_role("button", name="Send").click()
    frame = chat.locator(".bubble .widget iframe").first
    frame.wait_for(state="visible", timeout=15_000)
    assert frame.get_attribute("sandbox") == "allow-scripts", frame.get_attribute("sandbox")

    assert not errors, errors
    print("chat browser check passed")
    browser.close()
