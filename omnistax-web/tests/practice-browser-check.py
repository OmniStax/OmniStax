"""Browser check for revealing an answer, in every place a card stands: a
section loaded with the page, a section fetched later, a practice session, and
an exercise in a tab of its own. Then the practice settings.

Run against a built preview, for example:
    python3 tests/practice-browser-check.py http://127.0.0.1:4337
"""

import json
import re
import sys

from playwright.sync_api import sync_playwright


BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4337").rstrip("/")
BOOK = "college-physics-2e"
LAYOUT = "omnistax-layout-v6"


def reveal(page, scope: str, where: str) -> str:
    """Click the first reveal button under `scope` and assert the answer shows."""
    btn = page.locator(f"{scope} .exercise .reveal-btn").first
    btn.wait_for(state="visible", timeout=10000)
    cid = btn.evaluate("b => b.closest('.exercise').id")
    btn.click()
    card = page.locator(f'{scope} .exercise[id="{cid}"]')
    card.locator(".solution-block").wait_for(state="visible", timeout=3000)
    assert card.locator(".reveal-btn").count() == 0, where
    print(f"reveal ok: {where}")
    return cid


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(args=["--use-gl=swiftshader"])
    page = browser.new_page(viewport={"width": 1500, "height": 950})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)

    page.goto(f"{BASE}/{BOOK}/ch02/2.3/")
    page.evaluate("localStorage.clear()")
    page.reload()
    page.wait_for_load_state("networkidle")

    # A Try It in the section the page loaded with reveals its answer without
    # becoming graded practice.
    before = page.evaluate("JSON.stringify(Object.entries(localStorage).filter(([k]) => !k.startsWith('omnistax-layout')))")
    cid = reveal(page, ".pane:not([hidden])", "section at boot")
    assert page.locator(f'.pane:not([hidden]) .exercise[id="{cid}"] .selfcheck').count() == 0
    assert page.evaluate("JSON.stringify(Object.entries(localStorage).filter(([k]) => !k.startsWith('omnistax-layout')))") == before

    # The same card in a section fetched after the page loaded.
    page.goto(f"{BASE}/{BOOK}/ch02/2.2/")
    page.evaluate("localStorage.clear()")
    page.reload()
    page.wait_for_load_state("networkidle")
    page.evaluate(f"""() => {{
      const a = document.createElement('a'); a.href = '/{BOOK}/ch02/2.3/'; a.textContent = 'go';
      document.querySelector('.pane:not([hidden]) article').append(a); a.click();
    }}""")
    page.locator('.pane:not([hidden]) article[data-doc="2.3/text"]').wait_for(state="visible")
    reveal(page, ".pane:not([hidden])", "section fetched later")

    # A session in the practice view: step through until a card that reveals.
    page.locator('.rail button[aria-label="Exercises"]').click()
    exercises = page.locator('.pane:not([hidden]) .view[data-view="exercises"]')
    exercises.wait_for(state="visible")
    exercises.get_by_role("button", name="New Practice Session").click()
    exercises.get_by_role("button", name="Open this book").first.click()
    exercises.get_by_role("button", name="Open this chapter").nth(1).click()
    exercises.locator("label.lvl-section", has_text="2.3").first.locator('input[type="checkbox"]').check()
    start = exercises.get_by_role("button", name=re.compile(r"^Start [1-9][0-9]*$"))
    start.wait_for(state="visible")
    assert exercises.get_by_role("radiogroup", name="Exercise order").get_by_text("Mixed", exact=True).count() == 1
    start.click()
    exercises.locator(".practise .exercise").first.wait_for(state="visible")
    steps = exercises.locator(".question-grid button")
    for i in range(steps.count()):
        if exercises.locator(".practise .exercise:not([hidden]) .reveal-btn").count():
            break
        steps.nth(i).click()
    reveal(page, '.pane:not([hidden]) .view[data-view="exercises"] .practise', "practice session")
    assert exercises.locator(".practise .selfcheck").first.is_visible()

    # An exercise in a tab of its own.
    ex = cid.split("-ex-", 1)[1]
    layout = json.loads(page.evaluate(f"localStorage.getItem('{LAYOUT}')"))
    key = f"ex:{BOOK}/2.3/{ex}"
    g = layout["groups"][layout["focus"]]
    g["tabs"] = [*g["tabs"], key]
    g["active"] = key
    page.evaluate(f"localStorage.setItem('{LAYOUT}', {json.dumps(json.dumps(layout))})")
    page.reload()
    page.wait_for_load_state("networkidle")
    reveal(page, ".pane:not([hidden])", "exercise tab")

    page.locator("#gear").click()
    settings = page.locator("#settings")
    settings.wait_for(state="visible")
    for label in ("Mastery target", "Freshness decay", "Starting half-life", "Maximum half-life", "Exercise order", "Include fresh concepts"):
        assert settings.get_by_text(label, exact=True).count() == 1, label

    assert not errors, errors
    print("practice browser check passed")
    browser.close()
