"""Browser check for speech input in the chat box, with the browser's speech
recognition replaced by a fake the check drives: the words land where the
cursor stood as they are heard, typing or sending stops the listening, a
refused microphone says so, the button is off without recognition, in the
desktop app and offline, and the language follows OmniStax unless Settings
says otherwise.

Run against a served site, e.g.:
    python3 tests/dictation-browser-check.py http://127.0.0.1:4337 [screenshot.png]
"""

import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4337").rstrip("/")
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
PATH = "/college-physics-2e/ch01/1.1/"

# A recognition the page can start and the check can speak through.
FAKE = """
window.__rec = [];
class FakeRecognition {
  constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; this.onresult = null; this.onerror = null; this.onend = null; window.__rec.push(this); }
  start() { this.started = true; }
  stop() { this.stopped = true; setTimeout(() => this.onend && this.onend(), 0); }
  abort() { this.stop(); }
  say(parts) { this.onresult && this.onresult({ results: parts.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f })) }); }
  fail(error) { this.onerror && this.onerror({ error }); this.onend && this.onend(); }
}
window.webkitSpeechRecognition = FakeRecognition;
window.SpeechRecognition = FakeRecognition;
"""


def open_chat(page):
    page.locator(".rail").get_by_role("button", name="Ask AI", exact=True).click()
    page.locator(".conversations").get_by_role("button", name="New chat").click()
    chat = page.locator(".chat-tab").first
    chat.wait_for(state="visible")
    return chat.locator(".composer")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context(viewport={"width": 1280, "height": 860})
    context.add_init_script(FAKE)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE + PATH)
    page.wait_for_selector(".shell")

    composer = open_chat(page)
    field = composer.locator("textarea")
    mic = composer.get_by_role("button", name="Speak instead of typing")
    assert mic.is_enabled()

    # Words land where the cursor stood, between what was typed, as they are heard.
    field.fill("What is  for a spring?")
    field.evaluate("(el) => el.setSelectionRange(8, 8)")
    mic.click()
    stop = composer.get_by_role("button", name="Stop listening")
    stop.wait_for()
    assert stop.get_attribute("aria-pressed") == "true"
    rec = "window.__rec[window.__rec.length - 1]"
    assert page.evaluate(f"{rec}.lang") == "en-US", page.evaluate(f"{rec}.lang")
    assert page.evaluate(f"{rec}.continuous && {rec}.interimResults")
    page.evaluate(f"{rec}.say([['the period', false]])")
    assert field.input_value() == "What is the period for a spring?", field.input_value()
    page.evaluate(f"{rec}.say([['the period', true], [' of oscillation', false]])")
    assert field.input_value() == "What is the period of oscillation for a spring?", field.input_value()
    if SHOT:
        page.locator(".chat-tab").first.screenshot(path=SHOT)

    # Pressing it again stops, and the words stay. Nothing was sent.
    stop.click()
    mic.wait_for()
    assert field.input_value() == "What is the period of oscillation for a spring?"
    assert page.locator(".chat-tab .bubble").count() == 0

    # Typing stops the listening, so the two never fight over the field.
    mic.click()
    stop.wait_for()
    field.press("End")
    field.type(" Thanks")
    mic.wait_for()
    assert page.evaluate(f"{rec}.stopped") is True

    # A refused microphone is said, and the button comes back.
    mic.click()
    page.evaluate(f"{rec}.fail('not-allowed')")
    page.get_by_text("can’t use the microphone").wait_for()
    mic.wait_for()

    # Offline, the button is off and says why; back online, it is on again.
    context.set_offline(True)
    off = composer.get_by_role("button", name="Speech input needs an internet connection")
    off.wait_for()
    assert off.is_disabled()
    context.set_offline(False)
    mic.wait_for()
    assert mic.is_enabled()

    # Settings: the language follows OmniStax until another is chosen, and the choice is kept.
    page.locator("#gear").click()
    dialog = page.locator("#settings")
    dialog.wait_for(state="visible")
    dialog.get_by_role("searchbox", name="Search settings").fill("speech input")
    select = dialog.locator("#dictation-lang")
    select.wait_for()
    assert "Same as OmniStax" in select.locator("option").first.inner_text()
    assert select.locator("option").count() > 80
    select.select_option("fr-FR")
    assert page.evaluate("localStorage.getItem('omnistax-dictation-lang')") == "fr-FR"
    if SHOT:
        dialog.screenshot(path=SHOT.replace(".png", "-settings.png"))
    page.keyboard.press("Escape")
    mic.click()
    assert page.evaluate(f"{rec}.lang") == "fr-FR"
    composer.get_by_role("button", name="Stop listening").click()

    # Without recognition, and in the desktop app, the button is off and says why.
    for script, label in [
        ("delete window.webkitSpeechRecognition; delete window.SpeechRecognition;", "Speech input isn’t available in this browser"),
        ("window.omnistaxDesktop = { platform: 'linux' };", "Speech input isn’t available in the desktop app"),
    ]:
        other = browser.new_context(viewport={"width": 1280, "height": 860})
        other.add_init_script(FAKE)
        other.add_init_script(script)
        p = other.new_page()
        p.on("pageerror", lambda error: errors.append(str(error)))
        p.goto(BASE + PATH)
        p.wait_for_selector(".shell")
        button = open_chat(p).get_by_role("button", name=label)
        button.wait_for()
        assert button.is_disabled(), label
        other.close()

    assert not errors, errors
    print("dictation-browser-check: ok")
    browser.close()
