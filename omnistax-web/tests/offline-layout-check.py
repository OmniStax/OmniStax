"""Narrow/wide layout checks for offline-book and reader-backup controls."""
import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4337").rstrip("/")


def contained(locator):
    assert locator.evaluate("el => el.scrollWidth <= el.clientWidth + 1"), "Horizontal overflow"
    for button in locator.get_by_role("button").all():
        if button.is_visible():
            assert button.evaluate("""el => {
              const r = el.getBoundingClientRect();
              return r.left >= 0 && r.right <= innerWidth + 1;
            }"""), button.inner_text()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    for width in [390, 1280]:
        page = browser.new_page(viewport={"width": width, "height": 900})
        page.goto(BASE + "/sandbox/ch01/1.1/")
        page.wait_for_selector(".shell")
        find = page.locator(".row.r-find")
        if not find.is_visible():
            # Narrow screens collapse the sidebar; the rail button opens it as an overlay.
            page.get_by_role("button", name="Explorer", exact=True).first.click()
            find.wait_for(state="visible")
        find.click()
        finder = page.locator(".finder")
        finder.locator(".book").first.wait_for()
        contained(finder.locator(".list"))
        # A long failed-update message must wrap, not push controls off-screen.
        page.evaluate("""() => {
          const message = document.createElement('span');
          message.textContent = 'A textbook update could not be checked. '.repeat(8);
          document.querySelector('.updates').append(message);
        }""")
        contained(finder.locator(".list"))
        page.screenshot(path=f"/tmp/omnistax-offline-{width}.png")
        page.keyboard.press("Escape")
        page.locator("#gear").click()
        settings = page.locator("#settings")
        settings.wait_for(state="visible")
        settings.get_by_role("button", name="Export", exact=True).scroll_into_view_if_needed()
        contained(settings)
        page.screenshot(path=f"/tmp/omnistax-backup-{width}.png")
        page.close()
    browser.close()
    print("offline/backup narrow and wide layout checks passed")
