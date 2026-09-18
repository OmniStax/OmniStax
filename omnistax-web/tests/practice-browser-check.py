"""Focused browser smoke check for the practice workflow.

Run against a built preview, for example:
    python3 tests/practice-browser-check.py http://127.0.0.1:4337
"""

import re
import sys

from playwright.sync_api import sync_playwright


BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4337").rstrip("/")


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

    # Inline Try Its reveal their answer without becoming graded practice.
    inline = page.locator(".pane:not([hidden]) .exercise").first
    if inline.count() and inline.get_by_role("button", name="Reveal answer").count():
        before = page.evaluate("JSON.stringify(localStorage)")
        inline.get_by_role("button", name="Reveal answer").click()
        assert inline.locator(".selfcheck").count() == 0
        assert page.evaluate("JSON.stringify(localStorage)") == before

    page.get_by_role("button", name="Exercises", exact=True).click()
    exercises = page.locator('.view[data-view="exercises"]')
    exercises.wait_for(state="visible")

    exercises.get_by_role("button", name="Practice", exact=True).click()
    exercises.get_by_role("button", name="Open this book").first.click()
    exercises.get_by_role("button", name="Open this chapter").first.click()
    section = exercises.locator("label.lvl-section", has_text="1.1").first
    section.locator('input[type="checkbox"]').check()

    start = exercises.get_by_role("button", name=re.compile(r"^Start [1-9][0-9]*$"))
    start.wait_for(state="visible")
    assert exercises.get_by_role("radiogroup", name="Exercise order").get_by_text("Mixed", exact=True).count() == 1
    assert exercises.get_by_role("radiogroup", name="Exercise order").get_by_text("Grouped", exact=True).count() == 1
    assert exercises.locator(".selection .pick", has_text="1.1").count() == 1
    assert re.match(r"^(Enrolled|Attempted) ", exercises.locator(".diagnostic").inner_text())

    start.click()
    exercises.locator(".practise .exercise").wait_for(state="visible")
    assert exercises.locator(".question-grid button").count() > 0
    assert exercises.get_by_role("button", name="Show all exercises").count() == 1

    # Dashboard progress drills from book to chapter to section; its inline
    # override keeps decay opt-out gated behind an explicit Mastered state.
    exercises.get_by_role("button", name="Dashboard", exact=True).click()
    progress = exercises.get_by_role("region", name="Concept progress")
    progress.locator(".chapter-node").first.wait_for(state="visible")
    progress.locator(".chapter-node").first.click()
    progress.locator(".section-node").first.click()
    progress.get_by_role("button", name="Override progress", exact=True).click()
    row = progress.locator(".concept-progress-row").first
    select = row.locator("select")
    no_decay = row.locator('.no-decay input[type="checkbox"]')
    assert no_decay.is_disabled()
    select.select_option("mastered")
    assert not no_decay.is_disabled()

    page.locator("#gear").click()
    settings = page.locator("#settings")
    settings.wait_for(state="visible")
    for label in (
        "Mastery target",
        "Freshness decay",
        "Starting half-life",
        "Maximum half-life",
        "Exercise order",
        "Include fresh concepts",
    ):
        assert settings.get_by_text(label, exact=True).count() == 1, label
    assert settings.get_by_text("Review intervals", exact=True).count() == 1

    assert not errors, errors
    print("practice browser smoke check passed")
    browser.close()
