"""Browser check for Conversations, the times and the tree view, against the mock provider.

    python3 tests/mock-openai.py 8094 &
    python3 -m http.server -d dist 8093 &
    python3 tests/chat-views-browser-check.py http://127.0.0.1:8093 http://127.0.0.1:8094 [shots-dir]
"""

import json
import sys

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8093").rstrip("/")
MOCK = (sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8094").rstrip("/")
SHOTS = sys.argv[3] if len(sys.argv) > 3 else None

# The first stored shape, which the settings read as a Local AI endpoint chosen.
AI = {
    "provider": "compatible",
    "models": {"anthropic": "", "openai": "", "gemini": "", "compatible": "mock-1"},
    "baseUrl": MOCK,
    "keys": {"anthropic": "", "openai": "", "gemini": "", "compatible": ""},
}

DONE = "() => [...document.querySelectorAll('.bubble[data-role=\"assistant\"]')].every((b) => b.dataset.state !== 'streaming')"


def shot(page, name):
    if SHOTS:
        page.screenshot(path=f"{SHOTS}/{name}.png")


def ask(chat, page, words):
    composer = chat.locator(".composer")
    composer.locator("textarea").fill(words)
    composer.get_by_role("button", name="Send").click()
    page.wait_for_timeout(200)
    page.wait_for_function(DONE, timeout=15_000)


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

    # The rail opens Conversations; "New chat" there opens a chat.
    page.locator(".rail").get_by_role("button", name="Conversations", exact=True).click()
    conv = page.locator(".conversations")
    conv.wait_for(state="visible")
    assert conv.locator(".empty").inner_text() == "No chats yet."
    conv.get_by_role("button", name="New chat").click()
    chat = page.locator(".chat-tab").first
    chat.wait_for(state="visible")

    # The reader's own words are markdown with maths, and every bubble has its time.
    ask(chat, page, "What is **\\(T\\)** for a pendulum?")
    mine = chat.locator(".bubble[data-role='user']").first
    assert mine.locator("strong").count() == 1, mine.inner_html()
    assert mine.locator(".katex").count() == 1, "the reader's maths was not set"
    assert chat.locator(".bubble .at").count() == 2
    assert chat.locator(".day").count() == 1 and chat.locator(".day").inner_text().lower() == "today"

    # Edit forks: two first questions.
    mine.get_by_role("button", name="Edit").click()
    mine.locator("textarea").fill("And for a spring?")
    mine.locator("textarea").press("Enter")
    page.wait_for_function("() => document.querySelector('.bubble[data-role=\"user\"] .pager .count')", timeout=15_000)
    page.wait_for_function(DONE, timeout=15_000)
    assert chat.locator(".bubble[data-role='user'] .pager .count").first.inner_text() == "2/2"
    ask(chat, page, "Thanks.")

    # The tree shows every message; the current path is emphasised.
    chat.get_by_role("button", name="Tree").click()
    tree = chat.locator("[data-tree]")
    tree.wait_for(state="visible")
    nodes = tree.locator(".node")
    assert nodes.count() == 6, nodes.count()
    assert tree.locator(".node.on").count() == 4
    shot(page, "tree")

    # Select the older first answer and reply there: a new branch under it.
    older = tree.locator(".node[data-role='assistant']:not(.on)").first
    older.click()
    assert tree.locator(".node.selected").count() == 1
    ask(chat, page, "Under the old answer.")
    assert nodes.count() == 8, nodes.count()
    under = tree.locator(".node.on[data-role='user']")
    assert any("Under the old answer" in under.nth(i).inner_text() for i in range(under.count()))

    # The tree is remembered for the chat; double click opens the transcript there.
    assert chat.get_by_role("button", name="Tree").get_attribute("aria-pressed") == "true"
    tree.locator(".node[data-role='user']").first.dblclick()
    chat.locator(".messages").wait_for(state="visible")
    assert chat.locator(".bubble").count() >= 2

    # Rename and delete from Conversations, with Undo.
    page.locator(".rail").get_by_role("button", name="Conversations", exact=True).click()
    conv.wait_for(state="visible")
    row = conv.locator(".row").first
    assert "ago" in row.locator(".age").inner_text() or row.locator(".age").inner_text() == "just now"
    row.hover()
    row.get_by_role("button", name="Rename").click()
    conv.locator(".name-input").fill("Pendulums")
    conv.locator(".name-input").press("Enter")
    page.wait_for_function("() => document.querySelector('.conversations .row .name')?.textContent === 'Pendulums'")
    conv.get_by_label("Filter conversations").fill("zzz")
    assert conv.locator(".row").count() == 0
    conv.get_by_label("Filter conversations").fill("pend")
    assert conv.locator(".row").count() == 1
    shot(page, "conversations")
    conv.locator(".row").first.hover()
    conv.locator(".row").first.get_by_role("button", name="Delete").click()
    assert conv.locator(".row").count() == 0
    conv.get_by_role("button", name="Undo").click()
    assert conv.locator(".row").count() == 1
    conv.locator(".row").first.hover()
    conv.locator(".row").first.get_by_role("button", name="Delete").click()
    page.wait_for_timeout(6500)
    index = json.loads(page.evaluate("localStorage.getItem('omnistax-chats-v1')") or "[]")
    assert index == [], index

    browser.close()
    real = [e for e in errors if "favicon" not in e]
    assert not real, real
    print("chat views check passed")
