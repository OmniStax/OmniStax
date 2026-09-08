# Browser scenarios against a served dist/ (default http://localhost:8080). Needs: pip install playwright && playwright install chromium
from playwright.sync_api import sync_playwright
def tabs(pg): return pg.eval_on_selector_all('.group', 'gs=>gs.map(g=>[...g.querySelectorAll(".tab")].map(t=>t.querySelector(".ttl").textContent+(t.classList.contains("active")?"*":"")))')
def canv(pg): return pg.eval_on_selector_all('.group', 'gs=>gs.map(g=>g.querySelectorAll("canvas").length)')
js = None
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader']); pg = b.new_page(viewport={'width':1500,'height':900})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    js = lambda sel, n=0: pg.evaluate(f'document.querySelectorAll({sel!r})[{n}].click()')
    pg.goto('http://localhost:8080/college-physics-2e/ch02/2.1/'); pg.wait_for_timeout(1200); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(1500)
    # 1 split right duplicates
    js('.tabstrip .act[title="Split right"]'); pg.wait_for_timeout(600)
    print('1 split:', tabs(pg), canv(pg), 'focus:', pg.eval_on_selector_all('.group','gs=>gs.findIndex(g=>g.classList.contains("focus"))'))
    # 2 answer in copy survives closing the other
    pg.eval_on_selector('.group:nth-child(2) .exercise input', 'i=>{i.value="42"; i.dispatchEvent(new Event("input"))}')
    js('.group:nth-child(1) .tab .x', 0); pg.wait_for_timeout(400)
    print('2 closed left text:', tabs(pg), canv(pg), 'kept:', pg.eval_on_selector('.group:nth-child(2) .exercise input','i=>i.value'))
    # 3 open 2.5 via + into group 2: the "+" opens the command palette limited to the Sections group
    js('.tabstrip .plus', 1); pg.wait_for_timeout(300)
    print('3 palette:', pg.is_visible('.palette'), pg.eval_on_selector('.palette input', 'i=>i.placeholder'))
    row=[r for r in pg.query_selector_all('.palette .row') if r.query_selector('.lbl').inner_text().startswith('Open 2.5') and r.query_selector('.lbl').inner_text().endswith('Text')][0]; row.click(); pg.wait_for_timeout(2500)
    print('3 tabs:', tabs(pg), canv(pg), 'url:', pg.url, 'title:', pg.title(), 'cards:', len(pg.query_selector_all('.exercise')))
    # 4 map scoped to 2.5 shows displacement ext node; click it -> pins and jumps to 2.1 copy
    ext = pg.eval_on_selector_all('.dag .node.ext','ns=>ns.map(n=>n.dataset.id)'); print('4 ext nodes:', ext)
    js('.dag .node.ext[data-id="displacement"]'); pg.wait_for_timeout(800)
    print('4 pinned:', pg.eval_on_selector_all('.dag .node.pinned','ns=>ns.map(n=>n.dataset.id)'), 'span-intro:', len(pg.query_selector_all('.span-intro')), 'active tab g1:', tabs(pg)[0], 'hot cards:', len(pg.query_selector_all('.exercise.hot')))
    # 5 TOC click scrolls focused pane
    js('.toc a', 3); pg.wait_for_timeout(800); print('5 pane scroll:', pg.eval_on_selector_all('.pane:not([hidden])','ps=>ps.map(p=>Math.round(p.scrollTop))'), 'spy:', pg.eval_on_selector_all('.toc a.active','as=>as.map(a=>a.textContent)'))
    # 6 exercises mode
    js('.group:nth-child(1) .tab', 0); pg.wait_for_timeout(300)
    js('.seg button', 1); pg.wait_for_timeout(300)
    print('6 one mode visible:', len(pg.query_selector_all('.group:nth-child(1) .exercise:not([hidden])')), pg.inner_text('.group:nth-child(1) .count'))
    js('.nav .tbtn', 1); pg.wait_for_timeout(200); print('6 next:', pg.inner_text('.group:nth-child(1) .count'))
    # 7 transport + settings
    t = pg.query_selector('.transport'); pg.evaluate('document.querySelector(".transport .speed").click()'); print('7 speed:', pg.eval_on_selector('.transport .speed','b=>b.textContent'))
    js('#gear'); pg.wait_for_timeout(200); print('7 settings:', pg.is_visible('#settings'))
    pg.evaluate('document.getElementById("anim-toggle").click()'); pg.wait_for_timeout(100); print('7 paused:', pg.evaluate('window.FIG.paused'), 'anim-off:', pg.evaluate('document.documentElement.classList.contains("anim-off")'))
    # #theme-toggle is the "dark" segment of the Theme radio group; the first segment is "system"
    pg.evaluate('document.getElementById("theme-toggle").click()'); pg.wait_for_timeout(100); print('7 theme:', pg.evaluate('document.documentElement.getAttribute("data-theme")'))
    pg.evaluate('document.getElementById("cc-toggle").click()'); pg.wait_for_timeout(100); print('7 cc off:', not pg.evaluate('document.documentElement.classList.contains("cc")'))
    pg.evaluate('document.getElementById("cc-toggle").click(); document.querySelector("#settings .seg[aria-label=Theme] button").click()')
    print('7 theme back to system:', pg.evaluate('document.documentElement.getAttribute("data-theme")') is None)
    # 7b fold and hide: the chevron in a heading folds its section; the eye hides a figure; both follow the id into every copy
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    pg.evaluate('document.querySelector(".pane:not([hidden]) section[id] > h2 > button.fold").click()'); pg.wait_for_timeout(100)
    print('7b folded:', pg.evaluate('JSON.parse(localStorage.getItem("omnistax-folded"))'), 'copies folded:', pg.evaluate('document.querySelectorAll("section.folded").length'))
    pg.evaluate('document.querySelector(".pane:not([hidden]) figure.demo[id] > .demo-head > button.fig-hide").click()'); pg.wait_for_timeout(100)
    print('7b hidden:', pg.evaluate('JSON.parse(localStorage.getItem("omnistax-hidden-figs"))'), 'stage display:', pg.evaluate('getComputedStyle(document.querySelector("figure.fig-hidden .stage")).display'))
    pg.keyboard.press('Control+Shift+BracketRight'); pg.keyboard.press('Control+Shift+J'); pg.wait_for_timeout(100)
    print('7b unfolded and shown:', pg.evaluate('document.querySelectorAll(".folded, .fig-hidden").length'))
    # 8 reload persistence
    pg.reload(); pg.wait_for_timeout(2500); print('8 after reload:', tabs(pg), canv(pg), 'paused:', pg.evaluate('window.FIG.paused'), 'mode one:', pg.evaluate('localStorage.getItem("omnistax-exmode")'))
    pg.screenshot(path='astro2.png')
    # 9 narrow overlay
    pg.set_viewport_size({'width':700,'height':800}); pg.wait_for_timeout(400)
    print('9 narrow sidebars hidden:', pg.eval_on_selector_all('.sidebar','ss=>ss.map(s=>s.hidden)'))
    js('.rail.left button', 0); pg.wait_for_timeout(300); print('9 overlay left visible:', pg.eval_on_selector_all('.sidebar','ss=>ss.map(s=>!s.hidden)'))
    print('errors:', errs[:6]); b.close()
