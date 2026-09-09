# Browser scenarios for the explorer and the note system against a served dist/ (default http://localhost:8080;
# pass another base URL as the first argument). Needs Playwright for Python, as tests/e2e.py does.
from playwright.sync_api import sync_playwright
import sys
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
def tabs(pg): return pg.eval_on_selector_all('.group', 'gs=>gs.map(g=>[...g.querySelectorAll(".tab")].map(t=>t.querySelector(".ttl").textContent+(t.classList.contains("active")?"*":"")))')
def rows(pg): return pg.eval_on_selector_all('.view[data-view="explorer"] .row', 'rs=>rs.map(r=>r.dataset.kind+":"+r.querySelector(".lbl")?.textContent.trim())')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader']); ctx = b.new_context(viewport={'width':1500,'height':900}, permissions=['clipboard-read','clipboard-write']); pg = ctx.new_page()
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto(BASE + '/'); pg.wait_for_timeout(1200); pg.evaluate('localStorage.clear(); indexedDB.deleteDatabase("omnistax-assets")'); pg.reload(); pg.wait_for_timeout(1500)
    print('1 landing tabs:', tabs(pg))
    print('1 explorer rows:', rows(pg)[:8])
    # expand chapter 2 → sections
    pass
    print('2 after chapter expand:', [r for r in rows(pg) if r.startswith('section')][:4])
    pg.click('.row[data-key="section:college-physics-2e/2.1"] .lbl'); pg.wait_for_timeout(2500)
    print('3 opened 2.1:', tabs(pg), 'url:', pg.url)
    pg.click('.row[data-key="section:college-physics-2e/2.1"] .twist'); pg.wait_for_timeout(400)
    subs = [r for r in rows(pg) if r.startswith('heading') or r.startswith('exercises')]
    print('4 subconcepts:', subs[:4], '...', subs[-1:])
    pg.click('.row[data-kind="exercises"] .lbl'); pg.wait_for_timeout(800)
    print('5 exercises opened:', tabs(pg))
    # find a textbook floater
    pg.click('.tool[title="Find a textbook"]'); pg.wait_for_timeout(600)
    print('6 finder:', pg.is_visible('.finder'), pg.eval_on_selector_all('.finder .book', 'bs=>bs.map(b=>b.querySelector(".name").textContent+" / "+b.querySelector("button.add").textContent)'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    # new note
    pg.click('.tool[title="New note"]'); pg.wait_for_timeout(500)
    pg.keyboard.type('Pendulum ideas'); pg.keyboard.press('Enter'); pg.wait_for_timeout(600)
    print('7 new note tabs:', tabs(pg), 'mode:', pg.evaluate('document.querySelector(".note-tab")?.dataset.mode'))
    pg.click('.cm-content'); pg.wait_for_timeout(200)
    pg.keyboard.type('# Pendulum\n\nPeriod $T = 2\\pi\\sqrt{L/g}$ and see [['); pg.wait_for_timeout(500)
    print('8 autocomplete items:', pg.eval_on_selector_all('.cm-tooltip-autocomplete li', 'ls=>ls.slice(0,3).map(l=>l.textContent)'), 'buffer tail:', pg.evaluate('document.querySelector(".cm-content").textContent.slice(-8)'))
    pg.keyboard.type('2.1'); pg.wait_for_timeout(300); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    pg.keyboard.type(' also $$E=mc^2$$'); pg.wait_for_timeout(300)
    print('9 body:', pg.evaluate('JSON.parse(localStorage.getItem("omnistax-notedocs-v1")||"[]").map(n=>n.body)'))
    pg.keyboard.press('Control+e'); pg.wait_for_timeout(500)
    print('10 view mode:', pg.evaluate('document.querySelector(".note-tab")?.dataset.mode'), 'katex:', pg.evaluate('document.querySelectorAll(".note-view .katex").length'), 'wiki:', pg.eval_on_selector_all('.note-view a.wiki', 'as=>as.map(a=>a.dataset.link+"|"+a.textContent)'))
    pg.click('.note-view a.wiki'); pg.wait_for_timeout(600)
    print('11 wiki click → tabs:', tabs(pg))
    # highlight + copy link
    pg.evaluate('''() => { const t=[...document.querySelectorAll(".pane:not([hidden]) article[data-doc] p")].find(p=>p.textContent.trim().length>60); const r=document.createRange(); const tn=[...t.childNodes].find(n=>n.nodeType===3&&n.data.length>30); r.setStart(tn,2); r.setEnd(tn,28); const s=getSelection(); s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new Event("selectionchange")); }'''); pg.wait_for_timeout(500)
    print('12 hl bar:', pg.is_visible('.hl-bar'), pg.eval_on_selector_all('.hl-bar button', 'bs=>bs.map(b=>b.textContent||b.title)'))
    pg.click('.hl-bar button:has-text("Copy link")'); pg.wait_for_timeout(400)
    clip = pg.evaluate('navigator.clipboard.readText()')
    print('13 clipboard:', clip, 'marks:', pg.evaluate('document.querySelectorAll("mark.hl").length'))
    # paste embed into the note
    pg.evaluate('[...document.querySelectorAll(".tab")].find(t=>t.querySelector(".ttl").textContent.startsWith("Pendulum")).click()'); pg.wait_for_timeout(400)
    pg.keyboard.press('Control+e'); pg.wait_for_timeout(400)
    pg.click('.cm-content'); pg.keyboard.press('Control+End'); pg.keyboard.type('\n\n' + clip); pg.wait_for_timeout(300)
    pg.keyboard.press('Control+e'); pg.wait_for_timeout(500)
    print('14 embed:', pg.eval_on_selector_all('.note-view .hl-embed', 'es=>es.map(e=>e.className+" | "+e.querySelector("blockquote").textContent.slice(0,30))'))
    # annotations view exists & drag view into group via command
    pg.keyboard.press('Control+k'); pg.wait_for_timeout(300); pg.keyboard.type('Open Annotations in a group'); pg.wait_for_timeout(300); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    print('15 annotations tab:', [t for g in tabs(pg) for t in g if t.startswith('Annotations')], 'cards:', pg.evaluate('document.querySelectorAll(".view[data-view=annotations] .note").length'))
    # rename note in explorer & reload persistence
    pg.reload(); pg.wait_for_timeout(1500)
    print('16 after reload tabs:', tabs(pg), 'note rows:', [r for r in rows(pg) if r.startswith('note')])
    # new folder + note inside
    pg.click('.tool[title="New folder"]'); pg.wait_for_timeout(300); pg.keyboard.type('Physics'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    print('17 folder:', [r for r in rows(pg) if r.startswith('folder')])
    print('errors:', errs[:6])
    b.close()
