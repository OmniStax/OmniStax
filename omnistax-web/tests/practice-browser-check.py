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

    # Set up a session in the practice view: a section, then one exact exercise.
    page.locator('.rail button[aria-label="Exercises"]').click()
    exercises = page.locator('.pane:not([hidden]) .view[data-view="exercises"]')
    exercises.wait_for(state="visible")
    exercises.get_by_role("button", name="New practice session").click()
    exercises.get_by_role("button", name="Open 2 · Kinematics", exact=True).click()
    exercises.get_by_role("checkbox", name="Select 2.3 · Time, Velocity, and Speed", exact=True).check()
    exercises.get_by_role("radio", name="Book only", exact=True).click()
    start = exercises.get_by_role("button", name=re.compile(r"^Start [1-9][0-9]* exercises$"))
    start.wait_for(state="visible", timeout=10000)
    assert exercises.get_by_role("radio", name="Mixed", exact=True).count() == 1
    count = lambda: int(re.search(r"\d+", start.inner_text()).group())
    sized = count()

    exercises.get_by_role("radiogroup", name="Sections open to").get_by_role("radio", name="Exercises", exact=True).click()
    exercises.get_by_role("button", name="Open 2.3 · Time, Velocity, and Speed", exact=True).click()
    exercises.locator(".row:has(.lab.ex)").first.locator('input[type="checkbox"]').check()
    start.wait_for(state="visible")
    assert count() >= sized, (count(), sized)
    exercises.locator("details summary", has_text=re.compile(r"^The \d+ exercises?$")).click()
    picked = exercises.locator("details li.ex", has=page.locator(".tag", has_text="picked"))
    picked.first.wait_for(state="visible", timeout=5000)
    print("builder ok")

    # A session: step through until a card that reveals, then mark it.
    start.click()
    run = '.pane:not([hidden]) .view[data-view="exercises"] .run'
    exercises.locator(".run .exercise").first.wait_for(state="visible", timeout=10000)
    steps = exercises.get_by_role("button", name=re.compile(r"^Exercise \d+"))
    for i in range(steps.count()):
        if exercises.locator(".run .exercise .reveal-btn").count():
            break
        steps.nth(i).click()
    reveal(page, run, "practice session")
    selfcheck = exercises.locator(".run .selfcheck").first
    assert selfcheck.is_visible()
    current = exercises.get_by_role("button", name=re.compile(r"^Exercise \d+, current$"))
    was = current.first.get_attribute("aria-label") if current.count() else None
    exercises.get_by_role("button", name="I got it right", exact=True).click()
    exercises.get_by_role("button", name=re.compile(r"^Exercise \d+, correct$")).first.wait_for(timeout=5000)
    assert exercises.get_by_role("button", name=re.compile(r"^Exercise \d+, correct$")).count() == 1
    now = current.first.get_attribute("aria-label") if current.count() else None
    assert now != was, (was, now)
    print("session ok")

    # End it: the review shows each exercise without reveal or self-check.
    exercises.get_by_role("button", name="End session", exact=True).click()
    exercises.locator(".confirm").get_by_role("button", name="End session", exact=True).click()
    again = exercises.get_by_role("button", name="Practice all again", exact=True)
    again.wait_for(state="visible", timeout=10000)
    assert exercises.get_by_role("heading", name=re.compile(r"^Session ·")).count() >= 1
    row = exercises.locator("li.ex").first
    row.locator("button[aria-expanded]").click()
    row.locator(".exercise").first.wait_for(state="visible", timeout=10000)
    assert row.locator(".reveal-btn").count() == 0
    assert row.locator(".selfcheck").count() == 0
    print("review ok")

    # Practise again seeds the builder; the dashboard lists the past session.
    again.click()
    start.wait_for(state="visible", timeout=10000)
    exercises.get_by_role("button", name="‹ Practice", exact=True).click()
    past = exercises.locator("li.row.past", has_text="correct")
    past.first.wait_for(state="visible", timeout=10000)
    clear = exercises.get_by_role("button", name="Clear", exact=True)
    if clear.is_visible():
        clear.click()
        exercises.get_by_role("button", name="Set up session", exact=True).wait_for(state="hidden", timeout=5000)
    assert not exercises.get_by_role("button", name="Set up session", exact=True).is_visible()
    print("dashboard ok")

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
