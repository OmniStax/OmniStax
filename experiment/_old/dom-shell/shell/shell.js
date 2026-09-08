/* OmniStax shell: rails, sidebars of views, tabbed document groups, section loading.
   Content (documents) is static and pre-rendered per section; the shell composes it.
   Depends on window.FIG (figlib.js), KaTeX, and the page's inline data blocks. */
(function () {
'use strict';
const F = window.FIG;
const { $, $$, el, tex, renderMath, REDUCED, SYM } = F;
const ROOT = ($('meta[name="omnistax-root"]') || {}).content || './';
const PAGE = { book: document.documentElement.dataset.book, chapter: document.documentElement.dataset.chapter, section: document.documentElement.dataset.section };
const BOOK = JSON.parse($('#data-book').textContent);
const CHAP = {};   // chapter dir -> {concepts, formulas}
CHAP[PAGE.chapter] = { concepts: JSON.parse($('#data-concepts').textContent), formulas: JSON.parse($('#data-formulas').textContent) };
const SEC = {};    // section id -> {meta, exercises, docs:{text,exercises}, chapter}
const secEntry = (id) => { for (const c of BOOK.chapters) for (const s of c.sections) if (s.id === id) return Object.assign({ chapter: c }, s); return null; };
const secOf = (spanId) => spanId.slice(0, spanId.indexOf('-'));
const chapterOf = (sec) => { const e = secEntry(sec); return e ? e.chapter.dir : PAGE.chapter; };
const concepts = () => Object.values(CHAP).flatMap((c) => c.concepts.concepts);
const coverage = () => Object.values(CHAP).flatMap((c) => c.concepts.coverage);
const byId = () => { const m = {}; concepts().forEach((c) => m[c.id] = c); return m; };

/* =====================================================================
   Exercises: cards built from a section's JSON into that section's documents
===================================================================== */
const KIND = { 'check-understanding': 'Check Your Understanding', 'problem': 'Problem', 'ap-test-prep': 'AP test prep', 'conceptual-question': 'Conceptual question' };
const conceptName = (id) => { const c = byId()[id]; return c ? c.name : id; };
function nearly(input, value) { const tol = Math.max(Math.abs(value) * 0.02, 0.005); return Math.abs(input - value) <= tol; }
function exerciseCard(sec, ex) {
  const card = el('div', 'exercise'); card.id = sec + '-ex-' + ex.id;
  const meta = el('div', 'meta');
  meta.appendChild(el('span', 'chip', KIND[ex.kind] || ex.kind));
  if (ex.tag) meta.appendChild(el('span', 'chip', ex.tag));
  meta.appendChild(el('span', 'chip bloom', ex.bloom));
  ex.concepts.forEach((c) => { const k = byId()[c]; const ch = el('button', 'chip concept k-' + (k ? k.kind : 'idea'), conceptName(c)); ch.type = 'button'; ch.dataset.concept = c; ch.title = k ? k.kind + ': click to pin' : c; ch.addEventListener('click', () => { pin(c); nodes[c] && jump(nodes[c], 'nearest'); }); meta.appendChild(ch); });
  card.appendChild(meta);
  card.appendChild(el('div', 'prompt', '<p>' + ex.prompt + '</p>'));
  const ans = ex.answer, fb = el('div', 'feedback');
  if (ans.type === 'number') {
    const row = el('div', 'answer-row');
    if (ans.part) row.appendChild(el('span', null, ans.part));
    const inp = el('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.placeholder = 'answer'; inp.setAttribute('aria-label', 'your answer');
    const unit = el('span', 'unit', ans.unit); const btn = el('button', 'btn', 'Check'); btn.type = 'button';
    const check = () => { const v = parseFloat(inp.value.replace(/,/g, '')); if (isNaN(v)) { fb.className = 'feedback bad'; fb.textContent = 'Enter a number.'; return; }
      if (nearly(v, ans.value)) { fb.className = 'feedback ok'; fb.textContent = 'Correct: ' + ans.value + ' ' + ans.unit; }
      else if (nearly(-v, ans.value)) { fb.className = 'feedback bad'; fb.textContent = 'Right magnitude, wrong sign. Which direction is positive?'; }
      else { fb.className = 'feedback bad'; fb.textContent = ans.hint || 'Not quite. Check units and which quantity the question asks for.'; } };
    btn.addEventListener('click', check); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    row.append(inp, unit, btn); card.appendChild(row);
  } else if (ans.type === 'multi') {
    // several numeric parts, one card (the book's (a) (b) (c) problems)
    ans.parts.forEach((p) => {
      const row = el('div', 'answer-row'); row.appendChild(el('span', 'part', p.part));
      const inp = el('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.placeholder = 'answer'; inp.setAttribute('aria-label', 'answer to part ' + p.part);
      const unit = el('span', 'unit', p.unit); const btn = el('button', 'btn', 'Check'); btn.type = 'button'; const pf = el('span', 'feedback inline');
      const check = () => { const v = parseFloat(inp.value.replace(/,/g, '')); if (isNaN(v)) { pf.className = 'feedback inline bad'; pf.textContent = 'Enter a number.'; return; }
        if (nearly(v, p.value)) { pf.className = 'feedback inline ok'; pf.textContent = 'Correct'; }
        else if (nearly(-v, p.value)) { pf.className = 'feedback inline bad'; pf.textContent = 'Wrong sign'; }
        else { pf.className = 'feedback inline bad'; pf.textContent = p.hint || 'Not quite'; } };
      btn.addEventListener('click', check); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
      row.append(inp, unit, btn, pf); card.appendChild(row);
    });
  } else if (ans.type === 'choice') {
    const ch = el('div', 'choices'); const name = 'c-' + sec + '-' + ex.id;
    ans.options.forEach((o, i) => { const l = el('label'); const r = el('input'); r.type = 'radio'; r.name = name; r.value = i; const s = el('span', null, o); l.append(r, s); ch.appendChild(l); });
    const btn = el('button', 'btn', 'Check'); btn.type = 'button';
    btn.addEventListener('click', () => { const sel = ch.querySelector('input:checked'); if (!sel) { fb.className = 'feedback bad'; fb.textContent = 'Pick one.'; return; }
      if (+sel.value === ans.correct) { fb.className = 'feedback ok'; fb.textContent = 'Correct.'; } else { fb.className = 'feedback bad'; fb.textContent = ans.hint || 'Not that one.'; } });
    card.append(ch, btn);
  }
  card.appendChild(fb);
  const foot = el('div', 'answer-row'); foot.style.marginTop = '6px';
  if (ex.cite) { const b = el('button', 'cite-link', 'Show me the passage'); b.type = 'button'; b.addEventListener('click', () => cite(sec + '-' + ex.cite)); foot.appendChild(b); }
  if (ans.solution) { const det = el('details', 'solution'); det.innerHTML = '<summary>' + (ans.type === 'open' ? 'Suggested approach' : 'Solution') + (ans.generated_by === 'ai' ? ' (AI)' : ' (book)') + '</summary><div>' + ans.solution + '</div>'; card.appendChild(det); }
  if (foot.children.length) card.appendChild(foot);
  renderMath(card);
  return card;
}
function cite(id) {
  const sec = findEl(id); if (!sec) return; const tgt = sec.querySelector('.cite-target') || sec;
  jump(tgt, 'center'); tgt.classList.add('flash'); setTimeout(() => tgt.classList.remove('flash'), 2000);
}
function mountExercises(sec, roots) {
  const S = SEC[sec]; roots = (roots || [S.docs.text, S.docs.exercises]).filter(Boolean);
  const fallback = roots.find((r) => (r.dataset.doc || '').endsWith('/exercises'));
  const host = (place) => { for (const r of roots) { const h = r.querySelector(`.exercises[data-place="${place}"]`); if (h) return h; } return fallback && fallback.querySelector('.exercises[data-place="end"]'); };
  S.exercises.forEach((ex) => { const h = host(ex.place || 'end'); if (h) h.appendChild(exerciseCard(sec, ex)); });
  roots.forEach((r) => $$('.exercises', r).forEach((h) => { if (!h.children.length || h.querySelector('.eyebrow, .ex-bar')) return; if (h.dataset.place === 'end') exerciseBar(h); else h.prepend(el('div', 'eyebrow', 'Try it')); }));
}
/* The end-of-section list can show every problem, or one at a time with previous/next. The choice is remembered. */
const EXMODE_KEY = 'omnistax-exmode';
let exMode = 'all'; try { if (localStorage.getItem(EXMODE_KEY) === 'one') exMode = 'one'; } catch (e) { }
function exerciseBar(h) {
  const cards = () => $$(':scope > .exercise', h); let at = 0;
  const bar = el('div', 'ex-bar'); const ey = el('div', 'eyebrow', 'Problems for this section');
  const seg = el('div', 'seg'); const bAll = el('button', null, 'All at once'); const bOne = el('button', null, 'One at a time'); [bAll, bOne].forEach((b) => { b.type = 'button'; seg.append(b); });
  const nav = el('div', 'ex-nav'); const prev = el('button', 'tbtn', '‹'); const cnt = el('span', 'ex-count'); const next = el('button', 'tbtn', '›'); [prev, next].forEach((b) => { b.type = 'button'; }); prev.title = 'Previous problem'; next.title = 'Next problem'; nav.append(prev, cnt, next);
  bar.append(ey, seg, nav); h.prepend(bar);
  const apply = () => {
    const cs = cards(); const one = exMode === 'one'; h.classList.toggle('one', one); bAll.classList.toggle('on', !one); bOne.classList.toggle('on', one); nav.hidden = !one;
    at = Math.max(0, Math.min(at, cs.length - 1)); cs.forEach((c, i) => { c.hidden = one && i !== at; }); cnt.textContent = cs.length ? (at + 1) + ' of ' + cs.length : ''; prev.disabled = at === 0; next.disabled = at >= cs.length - 1;
  };
  const setMode = (m) => { exMode = m; try { localStorage.setItem(EXMODE_KEY, m); } catch (e) { } $$('.exercises[data-place="end"]').forEach((x) => x.exApply && x.exApply()); };
  bAll.addEventListener('click', () => setMode('all')); bOne.addEventListener('click', () => setMode('one'));
  prev.addEventListener('click', () => { at--; apply(); h.scrollIntoView({ block: 'start', behavior: REDUCED ? 'auto' : 'smooth' }); });
  next.addEventListener('click', () => { at++; apply(); h.scrollIntoView({ block: 'start', behavior: REDUCED ? 'auto' : 'smooth' }); });
  h.exApply = apply; h.exShow = (card) => { const i = cards().indexOf(card); if (i >= 0) { at = i; apply(); } };
  apply();
}

/* =====================================================================
   Sections: adopt the page's inline fragment; fetch others on demand
===================================================================== */
const ICON = {
  text: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7M9 8h3"/></svg>',
  exercises: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/></svg>',
  contents: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="18" r="1" fill="currentColor"/></svg>',
  concepts: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M11 7.2 7 15.8M13 7.2l4 8.6"/></svg>',
  formulas: '<svg viewBox="0 0 24 24"><path d="M17 5H7l6 7-6 7h10"/></svg>',
  definitions: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/></svg>',
  notes: '<svg viewBox="0 0 24 24"><path d="M4 4h13l3 3v13H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  split: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/></svg>',
};
const pool = $('#pool'), viewsHost = $('#views');
const ITEMS = {};
$$('.view', viewsHost).forEach((e) => { ITEMS['view:' + e.dataset.view] = { id: 'view:' + e.dataset.view, kind: 'view', title: e.dataset.title, icon: ICON[e.dataset.view], side: e.dataset.side, el: e }; });
const VIEWS = ['view:concepts', 'view:contents', 'view:formulas', 'view:definitions', 'view:notes'];
const docTitle = (sec, which) => sec + ' ' + (which === 'text' ? 'Text' : 'Exercises');

function adoptFragment(container) {
  const secs = new Set();
  $$('script[data-section]', container).forEach((s) => { const d = JSON.parse(s.textContent); const id = s.dataset.section; SEC[id] = { meta: d.section, exercises: d.exercises, docs: {}, chapter: chapterOf(id) }; secs.add(id); s.remove(); });
  $$('article[data-doc]', container).forEach((a) => {
    const [sec, which] = a.dataset.doc.split('/'); if (!SEC[sec]) SEC[sec] = { meta: {}, exercises: [], docs: {}, chapter: chapterOf(sec) };
    SEC[sec].docs[which] = a; SEC[sec].src = SEC[sec].src || {}; SEC[sec].src[which] = a.outerHTML; secs.add(sec);
    const id = 'doc:' + a.dataset.doc; const old = ITEMS[id];
    ITEMS[id] = { id, kind: 'doc', sec, which, title: a.dataset.title || docTitle(sec, which), icon: ICON[which] || ICON.text, el: a };
    if (old && old.el.parentNode && old.el !== a) old.el.replaceWith(a);   // swap a loading placeholder in place
    if (a.dataset.math !== 'rendered') renderMath(a);
  });
  secs.forEach((sec) => { mountExercises(sec); bootFigures(sec); });
}
function bootFigures(sec, root) { const f = window.OMNISTAX_FIGURES && window.OMNISTAX_FIGURES[sec]; root = root || (SEC[sec] && SEC[sec].docs.text); if (f && root && !root.dataset.booted) { root.dataset.booted = '1'; try { f(root, F); } catch (e) { console.error('figures ' + sec, e); } } }
const loading = {};
function loadSection(sec) {
  if (SEC[sec] && SEC[sec].docs.text) return Promise.resolve();
  if (loading[sec]) return loading[sec];
  const e = secEntry(sec); if (!e || !e.built) return Promise.reject(new Error('unknown section ' + sec));
  const chapterData = CHAP[e.chapter.dir] ? Promise.resolve() : Promise.all([fetch(ROOT + e.chapter.concepts).then((r) => r.json()), fetch(ROOT + e.chapter.formulas).then((r) => r.json())]).then(([concepts, formulas]) => { CHAP[e.chapter.dir] = { concepts, formulas }; });
  const fig = new Promise((res) => { const s = document.createElement('script'); s.src = ROOT + e.figures; s.onload = res; s.onerror = res; document.body.appendChild(s); });
  loading[sec] = Promise.all([chapterData, fig, fetch(ROOT + e.fragment).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })])
    .then(([, , html]) => { const t = document.createElement('template'); t.innerHTML = html; adoptFragment(t.content); buildViews(); render(); })
    .catch((err) => { console.error(err); ['text', 'exercises'].forEach((w) => { const it = ITEMS['doc:' + sec + '/' + w]; if (it) it.el.innerHTML = '<div class="loading bad">Could not load ' + sec + ' (' + err.message + '). Loading other sections needs the site served over http; <a href="' + ROOT + e.url + '">open it as its own page</a>.</div>'; }); })
    .finally(() => { delete loading[sec]; });
  return loading[sec];
}
function placeholderItem(id) {
  const [sec, which] = id.slice(4).split('/'); const e = secEntry(sec); if (!e || !e.built) return null;
  const a = el('article', 'placeholder'); a.dataset.doc = sec + '/' + which; a.dataset.sec = sec; a.innerHTML = '<div class="loading">Loading ' + docTitle(sec, which) + '…</div>';
  ITEMS[id] = { id, kind: 'doc', sec, which, title: docTitle(sec, which), icon: ICON[which] || ICON.text, el: a, pending: true };
  loadSection(sec); return ITEMS[id];
}
const item = (id) => ITEMS[id] || (id.startsWith('doc:') ? placeholderItem(id) : null);

/* =====================================================================
   Views: concept map, contents, formulas, definitions (chapter data, scoped to the focused section)
===================================================================== */
const dagEl = $('#dag'), whyEl = $('#dag-why'); let nodes = {};
let pinned = null;
const COV = () => { const m = {}; coverage().forEach((c) => m[c.span] = c); return m; };
function spansOf(id) { const intro = [], uses = []; coverage().forEach((c) => { if ((c.introduces || []).includes(id)) intro.push(c.span); if ([...(c.uses || []), ...(c.reinforces || [])].includes(id)) uses.push(c.span); }); return { intro, uses }; }
function testedBy(id) { const out = []; Object.entries(SEC).forEach(([sec, S]) => (S.exercises || []).forEach((e) => { if (e.concepts.includes(id)) out.push(sec + '-ex-' + e.id); })); return out; }
const spanTitle = (id) => { const s = findEl(id); const h = s && s.querySelector('h2, h3'); if (!h) return id; const hc = h.cloneNode(true); $$('.katex-mathml', hc).forEach((m) => m.remove()); return hc.textContent.replace(/^Example [\d.]+ · /, ''); };
function pin(id) {
  pinned = (pinned === id) ? null : id;
  Object.values(nodes).forEach((n) => n.classList.toggle('pinned', n.dataset.id === pinned));
  $$('.span-intro, .span-uses').forEach((s) => s.classList.remove('span-intro', 'span-uses'));
  $$('.exercise.ex-hot').forEach((e) => e.classList.remove('ex-hot'));
  $$('.chip.concept.hot').forEach((e) => e.classList.remove('hot'));
  if (!pinned) return;
  const sp = spansOf(pinned);
  sp.intro.forEach((s) => allEls(s).forEach((e) => e.classList.add('span-intro')));
  sp.uses.forEach((s) => allEls(s).forEach((e) => e.classList.add('span-uses')));
  testedBy(pinned).forEach((x) => allEls(x).forEach((e) => e.classList.add('ex-hot')));
  $$(`.chip.concept[data-concept="${pinned}"]`).forEach((e) => e.classList.add('hot'));
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pinned) pin(pinned); });

let dagScope = undefined;
function dagRows(list) {
  // rows by prerequisite depth: other-section nodes first, then each node one row below its deepest prerequisite
  const ext = list.filter((c) => c.ext).map((c) => c.id), own = list.filter((c) => !c.ext);
  const depth = {}; const d = (c) => depth[c.id] ?? (depth[c.id] = 1 + Math.max(0, ...(c.prereqs || []).map((p) => { const q = own.find((r) => r.id === p); return q ? d(q) : 0; })));
  const byDepth = {}; own.forEach((c) => (byDepth[d(c)] = byDepth[d(c)] || []).push(c.id));
  return [ext, ...Object.keys(byDepth).sort((a, b) => a - b).map((k) => byDepth[k])].filter((r) => r.length);
}
function buildDag(scope) {
  // scope: a section id (that section's nodes plus their prerequisites from elsewhere) or null (whole chapter)
  const all = byId(); let list;
  if (scope) { const own = concepts().filter((c) => c.section === scope && !c.placeholder); const ids = new Set(own.map((c) => c.id)); const ext = []; own.forEach((c) => (c.prereqs || []).forEach((p) => { if (!ids.has(p) && all[p] && !ext.find((e) => e.id === p)) ext.push(Object.assign({}, all[p], { ext: true })); })); list = [...ext, ...own]; }
  else list = concepts().map((c) => Object.assign({}, c, { ext: !!c.placeholder }));
  dagEl.replaceChildren(); nodes = {};
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); dagEl.appendChild(svg);
  const listIds = new Set(list.map((c) => c.id));
  dagRows(list).forEach((row) => {
    const r = el('div', 'row'); if (row.length >= 3) r.classList.add('dense');
    row.forEach((id) => {
      const c = list.find((q) => q.id === id); const ext = c.ext;
      const b = el('button', 'node k-' + c.kind + (ext ? ' ext' : '')); b.type = 'button'; b.dataset.id = id;
      b.innerHTML = c.name + (ext ? '<small class="sec">' + c.section + '</small>' : ''); renderMath(b);
      const target = () => spansOf(id).intro[0] || spansOf(id).uses[0];
      b.addEventListener('click', () => {
        if (c.placeholder) { const e = secEntry(c.section); if (e && e.built) { openDoc(c.section, 'text'); return; } window.open((e && e.openstax) || BOOK.openstax, '_blank', 'noopener'); return; }
        const wasPinned = pinned === id; pin(id); const t = target();
        if (!wasPinned && t) goSpan(t);
      });
      const tb = testedBy(id).length;
      const why = c.placeholder
        ? `<b>${c.name}.</b> <span class="kind">section ${c.section}, not built yet</span><br>Opens the OpenStax page.`
        : `<b>${c.name}.</b> <span class="kind">${c.kind}${ext ? ' · section ' + c.section : ''}${spansOf(id).intro[0] ? ' · introduced in “' + spanTitle(spansOf(id).intro[0]) + '”' : ''} · tested by ${tb} exercise${tb === 1 ? '' : 's'}</span><br>${c.why || ''}<br><span class="kind">Click to pin: highlights where it is introduced, used and tested.</span>`;
      const showWhy = () => { whyEl.innerHTML = why; renderMath(whyEl); hot(id, true); };
      b.addEventListener('mouseenter', showWhy); b.addEventListener('focus', showWhy);
      b.addEventListener('mouseleave', () => hot(id, false)); b.addEventListener('blur', () => hot(id, false));
      r.appendChild(b); nodes[id] = b;
    });
    dagEl.appendChild(r);
  });
  const edges = []; list.forEach((c) => (c.prereqs || []).forEach((p) => { if (listIds.has(p)) edges.push([p, c.id]); }));
  const paths = {};
  function layout() {
    const R = dagEl.getBoundingClientRect(); svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`); svg.innerHTML = '';
    edges.forEach(([from, to]) => {
      if (!nodes[from] || !nodes[to]) return;
      const a = nodes[from].getBoundingClientRect(), b = nodes[to].getBoundingClientRect();
      const x1 = a.left + a.width / 2 - R.left, y1 = a.bottom - R.top, x2 = b.left + b.width / 2 - R.left, y2 = b.top - R.top;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`);
      svg.appendChild(p); (paths[from] = paths[from] || []).push(p); (paths[to] = paths[to] || []).push(p);
    });
  }
  function hot(id, on) { (paths[id] || []).forEach((p) => p.classList.toggle('hot', on)); }
  if (dagEl._ro) dagEl._ro.disconnect(); dagEl._ro = new ResizeObserver(layout); dagEl._ro.observe(dagEl); document.fonts && document.fonts.ready.then(layout); setTimeout(layout, 300);
  if (pinned) { const p = pinned; pinned = null; if (nodes[p]) pin(p); }
}

function buildContents(sec) {
  const host = $('#contents'); host.replaceChildren(); const S = SEC[sec]; if (!S) return;
  host.appendChild(el('div', 'sec-title', sec + ' · ' + (S.meta.title || '')));
  if (S.meta.objectives && S.meta.objectives.length) { const d = el('details', 'objectives'); d.innerHTML = '<summary>Learning objectives</summary><ul>' + S.meta.objectives.map((o) => '<li>' + o + '</li>').join('') + '</ul>'; host.appendChild(d); }
  const toc = el('nav', 'toc'); const docs = [S.docs.text, S.docs.exercises].filter(Boolean);
  docs.forEach((doc) => $$('section[id]', doc).forEach((s) => { const h = s.querySelector('h2, h3'); if (!h) return; const a = el('a'); a.href = '#' + s.id; a.textContent = spanTitle(s.id); a.dataset.anchor = s.id; toc.appendChild(a); }));
  host.appendChild(toc);
  if (S.meta.summary_html) { const d = el('details', 'summary'); d.innerHTML = '<summary>Section summary</summary>' + S.meta.summary_html; host.appendChild(d); }
  renderMath(host);
}
function buildFormulas(sec) {
  const host = $('#formulas'); host.replaceChildren();
  const eqs = Object.values(CHAP).flatMap((c) => c.formulas.equations).filter((e) => e.important);
  const groups = {}; eqs.forEach((e) => (groups[e.section] = groups[e.section] || []).push(e));
  const order = Object.keys(groups).sort((a, b) => (a === sec ? -1 : b === sec ? 1 : a.localeCompare(b, undefined, { numeric: true })));
  order.forEach((s) => {
    const e0 = secEntry(s); const wrap = s === sec ? host : (() => { const d = el('details', 'other'); d.innerHTML = '<summary>' + s + ' · ' + (e0 ? e0.title : '') + '</summary>'; host.appendChild(d); return d; })();
    if (s === sec) wrap.appendChild(el('div', 'eyebrow', s + ' · ' + (e0 ? e0.title : '')));
    groups[s].forEach((e) => {
      const b = el('button', 'formula'); b.type = 'button'; const m = el('div'); tex(m, e.ktex || e.latex); b.appendChild(m);
      b.appendChild(el('small', null, (e.constant_a ? 'requires constant a · ' : e.constant_a === false ? 'always true · ' : '') + (e.anchor ? 'in “' + spanTitle(e.anchor) + '”' : '')));
      b.addEventListener('click', () => goSpan(e.anchor)); wrap.appendChild(b);
    });
  });
}
function buildDefinitions(sec) {
  const host = $('#definitions'); host.replaceChildren();
  const vars = Object.values(CHAP).flatMap((c) => c.formulas.variables), terms = Object.values(CHAP).flatMap((c) => c.formulas.glossary || []);
  const block = (title, vs, ts) => {
    const frag = document.createDocumentFragment();
    if (vs.length) { frag.appendChild(el('div', 'eyebrow', title + ' · symbols')); const ul = el('ul', 'defs'); vs.forEach((v) => { const li = el('li'); const s = el('span', 'sym'); tex(s, SYM[v.sym] || v.sym); const m = el('span', null, v.meaning + '<span class="unit">' + v.unit + '</span>'); li.append(s, m); ul.appendChild(li); }); frag.appendChild(ul); }
    if (ts.length) { frag.appendChild(el('div', 'eyebrow', title + ' · terms')); const ul = el('ul', 'defs terms'); ts.forEach((t) => { const li = el('li'); li.append(el('span', 'term', t.term), el('span', null, t.definition)); ul.appendChild(li); }); frag.appendChild(ul); }
    return frag;
  };
  const secs = [...new Set([...vars.map((v) => v.section), ...terms.map((t) => t.section)])].sort((a, b) => (a === sec ? -1 : b === sec ? 1 : a.localeCompare(b, undefined, { numeric: true })));
  secs.forEach((s) => {
    const content = block(s, vars.filter((v) => v.section === s), terms.filter((t) => t.section === s));
    if (s === sec) host.appendChild(content); else { const d = el('details', 'other'); d.innerHTML = '<summary>' + s + ' · ' + ((secEntry(s) || {}).title || '') + '</summary>'; d.appendChild(content); host.appendChild(d); }
  });
  renderMath(host);
}
(function legend() { const lg = $('#legend'); [['t', 'time'], ['x', 'position, displacement'], ['v', 'velocity'], ['a', 'acceleration']].forEach(([k, n]) => { lg.appendChild(el('i', null)); lg.lastChild.style.background = 'var(--c-' + k + ')'; lg.appendChild(el('span', null, n)); }); })();
let viewsFor = null;
function buildViews(force) {
  const sec = focusedSection(); const mapAsTab = where('view:concepts') && where('view:concepts').type === 'group';
  const scope = mapAsTab ? null : sec; const key = sec + '|' + scope + '|' + Object.keys(SEC).join(',');
  if (!force && key === viewsFor) return; viewsFor = key;
  buildDag(scope); buildContents(sec); buildFormulas(sec); buildDefinitions(sec);
}
// scroll-spy on the focused pane: TOC follows the section; concept nodes follow the innermost span's coverage
function spy(pane) {
  const doc = pane && pane.querySelector('[data-doc]'); let current = null;
  if (doc) { const line = pane.getBoundingClientRect().top + pane.clientHeight * 0.25; $$('section[id], .example[id]', doc).forEach((sp) => { const r = sp.getBoundingClientRect(); if (r.top <= line && r.bottom > line) current = sp; }); }
  const sec = current && current.closest('section'); const secId = sec ? sec.id : current ? current.id : null;
  $$('#contents .toc a').forEach((a) => a.classList.toggle('active', a.dataset.anchor === secId));
  const cov = COV(); const c = current ? (cov[current.id] || cov[secId] || {}) : {};
  Object.values(nodes).forEach((n) => { n.classList.toggle('active', (c.introduces || []).includes(n.dataset.id)); n.classList.toggle('active-weak', (c.uses || []).includes(n.dataset.id)); });
}

/* =====================================================================
   Layout: rails, sidebars, groups, drag and drop, persistence
===================================================================== */
const LKEY = 'omnistax-layout-v3';
const DEFAULT = () => ({ sides: { left: { width: 270, items: ['view:concepts', 'view:contents'] }, right: { width: 300, items: ['view:formulas', 'view:definitions', 'view:notes'] } }, home: {}, collapsed: [], groups: [{ key: uid(), tabs: ['doc:' + PAGE.section + '/text', 'doc:' + PAGE.section + '/exercises'], active: 'doc:' + PAGE.section + '/text' }], focus: 0 });
function uid() { return Math.random().toString(36).slice(2, 8); }
const knownItem = (id) => VIEWS.includes(id) || (id.startsWith('doc:') && (() => { const e = secEntry(id.slice(4).split('/')[0]); return e && e.built; })());
function validLayout(s) {
  try {
    const ok = s && s.sides && s.groups && s.groups.length && s.groups.every((g) => g.tabs.every(knownItem) && new Set(g.tabs).size === g.tabs.length && (g.tabs.length === 0 || g.tabs.includes(g.active))) && ['left', 'right'].every((k) => s.sides[k] && s.sides[k].items.every((t) => VIEWS.includes(t)));
    if (ok) { const seen = new Set(); s.groups.forEach((g) => { if (!g.key || seen.has(g.key)) g.key = uid(); seen.add(g.key); }); }
    return ok;
  } catch (e) { return false; }
}
let LAY = (() => { try { const s = JSON.parse(localStorage.getItem(LKEY)); if (validLayout(s)) return s; } catch (e) { } return DEFAULT(); })();
function save() { try { localStorage.setItem(LKEY, JSON.stringify(LAY)); } catch (e) { } }
const homeSide = (id) => LAY.home[id] || (ITEMS[id] && ITEMS[id].side) || 'left';
const narrowMQ = matchMedia('(max-width: 900px)'); let overlay = null;
narrowMQ.addEventListener('change', () => { overlay = null; render(); });

function where(id) {
  for (const side of ['left', 'right']) if (LAY.sides[side].items.includes(id)) return { type: 'side', side };
  for (let g = 0; g < LAY.groups.length; g++) if (LAY.groups[g].tabs.includes(id)) return { type: 'group', g };
  return null;
}
function removeFrom(G, id) { const i = G.tabs.indexOf(id); if (i < 0) return; G.tabs.splice(i, 1); if (G.active === id) G.active = G.tabs[Math.min(i, G.tabs.length - 1)] || null; }
function detach(id) {
  ['left', 'right'].forEach((side) => { const it = LAY.sides[side].items; const i = it.indexOf(id); if (i >= 0) it.splice(i, 1); });
  LAY.groups.forEach((G) => removeFrom(G, id));
}
const groupByKey = (key) => LAY.groups.find((G) => G.key === key);
function pruneGroups() {
  if (LAY.groups.length > 1) LAY.groups = LAY.groups.filter((g) => g.tabs.length);
  if (!LAY.groups.length) LAY.groups = [{ key: uid(), tabs: [], active: null }];
  LAY.focus = Math.max(0, Math.min(LAY.focus, LAY.groups.length - 1));
}
function focusGroup(G) { pruneGroups(); const i = LAY.groups.indexOf(G); LAY.focus = i < 0 ? Math.min(LAY.focus, LAY.groups.length - 1) : i; }
function openSide(id, side) { if (!VIEWS.includes(id)) return openTab(id, LAY.focus); detach(id); LAY.sides[side].items.push(id); LAY.home[id] = side; overlay = side; pruneGroups(); render(); }
/* A view lives in one place; a document may be open in several groups. `from` (a group key) moves a tab instead of copying it. */
function openTab(id, g, { before, from } = {}) {
  g = Math.min(g, LAY.groups.length - 1); const G = LAY.groups[g];
  if (VIEWS.includes(id)) detach(id); else if (from && from !== G.key) { const S = groupByKey(from); if (S) removeFrom(S, id); }
  const cur = G.tabs.indexOf(id);
  if (before && before !== id) { if (cur >= 0) G.tabs.splice(cur, 1); const at = G.tabs.indexOf(before); G.tabs.splice(at < 0 ? G.tabs.length : at, 0, id); }
  else if (cur < 0) G.tabs.push(id);
  G.active = id; focusGroup(G); render();
}
function openDoc(sec, which, g) { const id = 'doc:' + sec + '/' + which; const l = g == null ? where(id) : null; if (l && l.type === 'group') { LAY.groups[l.g].active = id; LAY.focus = l.g; render(); } else openTab(id, g == null ? LAY.focus : g); return loadSection(sec); }
/* Split right: the active document is opened again in a new group to the right and keeps its place here; a view moves. */
function splitRight(g, id, from) {
  const G = LAY.groups[g]; if (!id) { id = G.active; if (!id) return; from = VIEWS.includes(id) ? G.key : null; }
  if (LAY.groups.length >= 2) return openTab(id, g + 1, { from });
  if (VIEWS.includes(id)) detach(id); else if (from) { const S = groupByKey(from); if (S) removeFrom(S, id); }
  const N = { key: uid(), tabs: [id], active: id }; LAY.groups.splice(g + 1, 0, N); focusGroup(N); render();
}
function closeItem(id, g) { if (g == null || VIEWS.includes(id)) detach(id); else removeFrom(LAY.groups[g], id); pruneGroups(); render(); }
function toggleCollapsed(id) { const i = LAY.collapsed.indexOf(id); if (i >= 0) LAY.collapsed.splice(i, 1); else LAY.collapsed.push(id); render(); }
function focusedSection() { const G = LAY.groups[LAY.focus]; const it = G && G.active && ITEMS[G.active]; return it && it.kind === 'doc' ? it.sec : PAGE.section; }

function reveal(node) {
  const host = node.closest('[data-doc], .view'); if (!host) return false;
  const id = host.dataset.doc ? 'doc:' + host.dataset.doc : 'view:' + host.dataset.view; const it = ITEMS[id]; if (!it) return false;
  const pane = node.closest('.pane'); const loc = pane && pane.isConnected ? { type: 'group', g: +pane.dataset.group } : where(id); let changed = false;
  if (it.kind === 'doc' && overlay) { overlay = null; changed = true; }
  if (it.kind === 'view' && loc && loc.type === 'side' && narrowMQ.matches && overlay !== loc.side) { overlay = loc.side; changed = true; }
  if (!loc) { if (it.kind === 'doc') openTab(id, LAY.focus); else openSide(id, homeSide(id)); return true; }
  if (loc.type === 'side') { const i = LAY.collapsed.indexOf(id); if (i >= 0) { LAY.collapsed.splice(i, 1); changed = true; } }
  else { const G = LAY.groups[loc.g]; if (G.active !== id || LAY.focus !== loc.g) { G.active = id; LAY.focus = loc.g; changed = true; } }
  if (changed) render(); return changed;
}
function jump(target, block = 'start') { if (!target) return; const card = target.closest('.exercise'); const h = card && card.parentElement; if (h && h.exShow && card.hidden) h.exShow(card); reveal(target); requestAnimationFrame(() => target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block })); }
function go(id, block = 'start') { jump(findEl(id), block); }
function goSpan(spanId) { if (!spanId) return; const t = findEl(spanId); if (t) return jump(t); const sec = secOf(spanId); openDoc(sec, 'text').then(() => go(spanId)); }

/* ----- drag and drop ----- */
let drag = null;
function dragStart(e, id, from) { drag = { id, from }; e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; }
function dropZone(zone, { over, leave, drop }) {
  zone.addEventListener('dragover', (e) => { if (!drag) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; over(e); });
  zone.addEventListener('dragleave', (e) => { if (!zone.contains(e.relatedTarget)) leave(e); });
  zone.addEventListener('drop', (e) => { if (!drag) return; e.preventDefault(); leave(e); const { id, from } = drag; drag = null; drop(id, e, from); });
}
document.addEventListener('dragend', () => { drag = null; $$('.drop, .drop-right').forEach((z) => z.classList.remove('drop', 'drop-right')); });

/* ----- rails ----- */
function railButton(it, side) {
  const b = el('button'); b.type = 'button'; b.innerHTML = it.icon; b.title = it.title; b.setAttribute('aria-label', it.title); b.draggable = true; b.dataset.item = it.id;
  const loc = where(it.id); b.classList.toggle('on', !!loc); b.classList.toggle('tab', !!loc && loc.type === 'group' && it.kind === 'view');
  b.addEventListener('click', () => {
    const l = where(it.id);
    if (!l) return it.kind === 'doc' ? openTab(it.id, LAY.focus) : openSide(it.id, side);
    if (l.type === 'side') { if (narrowMQ.matches) { overlay = overlay === l.side ? null : l.side; return render(); } return closeItem(it.id); }
    const G = LAY.groups[l.g]; G.active = it.id; LAY.focus = l.g; render();
  });
  b.addEventListener('dragstart', (e) => dragStart(e, it.id));
  return b;
}
function buildRails() {
  ['left', 'right'].forEach((side) => {
    const rail = $('#rail-' + side); rail.replaceChildren();
    VIEWS.map((v) => ITEMS[v]).filter((it) => it && homeSide(it.id) === side).forEach((it) => rail.appendChild(railButton(it, side)));
    rail.appendChild(el('div', 'spacer'));
    if (side === 'left') { const g = el('button'); g.type = 'button'; g.innerHTML = ICON.gear; g.title = 'Settings'; g.setAttribute('aria-label', 'Settings'); g.id = 'gear'; g.addEventListener('click', (e) => { e.stopPropagation(); const p = $('#settings'); p.hidden = !p.hidden; $('#picker').hidden = true; }); rail.appendChild(g); }
  });
}
['left', 'right'].forEach((side) => {
  const rail = $('#rail-' + side), aside = $('#side-' + side);
  const z = { over: () => rail.classList.add('drop'), leave: () => rail.classList.remove('drop'), drop: (id, e, from) => VIEWS.includes(id) ? openSide(id, side) : openTab(id, LAY.focus, { from }) };
  dropZone(rail, z);
  dropZone(aside, { over: () => aside.classList.add('drop'), leave: () => aside.classList.remove('drop'), drop: z.drop });
  const grip = $('.grip', aside);
  grip.addEventListener('pointerdown', (e) => {
    e.preventDefault(); grip.setPointerCapture(e.pointerId);
    const move = (ev) => { const r = aside.getBoundingClientRect(); const w = side === 'left' ? ev.clientX - r.left : r.right - ev.clientX; LAY.sides[side].width = Math.max(200, Math.min(520, Math.round(w))); aside.style.width = LAY.sides[side].width + 'px'; };
    const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); save(); F.redrawAll(); };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
  });
});

/* ----- picker: open any built section as a tab ----- */
function togglePicker(g, anchor) {
  const p = $('#picker'); if (!p.hidden && p.dataset.group === String(g)) { p.hidden = true; return; }
  $('#settings').hidden = true; p.dataset.group = String(g); p.replaceChildren(el('div', 'eyebrow', BOOK.title));
  if (anchor) { const r = anchor.getBoundingClientRect(); p.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 360)) + 'px'; p.style.top = (r.bottom + 4) + 'px'; p.style.bottom = 'auto'; }
  BOOK.chapters.forEach((c) => {
    p.appendChild(el('div', 'pk-ch', 'Chapter ' + c.id + ' · ' + c.title));
    c.sections.forEach((s) => {
      const row = el('div', 'pk-row' + (s.built ? '' : ' off')); row.appendChild(el('span', 'pk-title', s.id + ' ' + s.title));
      if (s.built) { ['text', 'exercises'].forEach((w) => { const b = el('button', 'btn-sm', w === 'text' ? 'Text' : 'Exercises'); b.type = 'button'; b.addEventListener('click', () => { p.hidden = true; openDoc(s.id, w, g); }); row.appendChild(b); }); }
      else row.appendChild(el('span', 'pk-soon', 'not built yet'));
      p.appendChild(row);
    });
  });
  p.hidden = false;
}

/* ----- sidebars ----- */
const vboxes = {};
function vboxFor(id) {
  if (vboxes[id]) return vboxes[id];
  const it = ITEMS[id]; const box = el('div', 'vbox'); box.dataset.item = id;
  const head = el('header'); head.draggable = true;
  const chev = el('button', 'chev', '▾'); chev.type = 'button'; chev.title = 'Collapse'; chev.addEventListener('click', () => toggleCollapsed(id));
  const ttl = el('span', 'eyebrow', it.title);
  const x = el('button', 'x', '×'); x.type = 'button'; x.title = 'Close'; x.addEventListener('click', () => closeItem(id));
  head.append(chev, ttl, x); head.addEventListener('dragstart', (e) => dragStart(e, id));
  const body = el('div', 'body'); box.append(head, body); box.body = body;
  return (vboxes[id] = box);
}

/* ----- document groups ----- */
const panes = {}, groupEls = [];
function paneFor(key, id) {
  const pk = key + '|' + id; if (panes[pk]) return panes[pk];
  const p = el('div', 'pane'); p.dataset.tab = id; p.dataset.key = key; panes[pk] = p;
  p.addEventListener('scroll', () => { if (+p.dataset.group === LAY.focus) spy(p); }, { passive: true });
  return p;
}
function groupFor(i) {
  if (groupEls[i]) return groupEls[i];
  const g = el('div', 'group'); const strip = el('div', 'tabstrip'); strip.setAttribute('role', 'tablist'); const body = el('div', 'group-body');
  g.append(strip, body); g.strip = strip; g.body = body;
  g.addEventListener('pointerdown', () => { if (LAY.focus !== i) { LAY.focus = i; save(); markFocus(); buildViews(); spyFocused(); syncUrl(); } });
  dropZone(strip, { over: () => strip.classList.add('drop'), leave: () => strip.classList.remove('drop'), drop: (id, e, from) => { const t = e.target.closest('.tab'); openTab(id, i, { before: t ? t.dataset.tab : null, from }); } });
  dropZone(body, {
    over: (e) => { const r = body.getBoundingClientRect(); const right = LAY.groups.length < 2 && e.clientX > r.left + r.width * 0.5; g.classList.toggle('drop-right', right); g.classList.toggle('drop', !right); },
    leave: () => g.classList.remove('drop', 'drop-right'),
    drop: (id, e, from) => { const r = body.getBoundingClientRect(); if (LAY.groups.length < 2 && e.clientX > r.left + r.width * 0.5) splitRight(i, id, from); else openTab(id, i, { from }); },
  });
  return (groupEls[i] = g);
}
function buildStrip(i, G) {
  const strip = groupFor(i).strip; strip.replaceChildren();
  G.tabs.forEach((id) => {
    const it = item(id); if (!it) return; const t = el('div', 'tab' + (id === G.active ? ' active' : '')); t.draggable = true; t.dataset.tab = id; t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', id === G.active);
    t.appendChild(el('span', 'ttl', it.title));
    const x = el('button', 'x', '×'); x.type = 'button'; x.title = 'Close'; x.setAttribute('aria-label', 'Close ' + it.title); x.addEventListener('click', (e) => { e.stopPropagation(); closeItem(id, i); });
    t.appendChild(x);
    t.addEventListener('click', () => { G.active = id; LAY.focus = i; render(); });
    t.addEventListener('dragstart', (e) => dragStart(e, id, G.key));
    strip.appendChild(t);
  });
  const plus = el('button', 'act plus'); plus.type = 'button'; plus.title = 'Open a section here'; plus.setAttribute('aria-label', 'Open a section in this group'); plus.innerHTML = ICON.plus; plus.addEventListener('click', (e) => { e.stopPropagation(); togglePicker(i, plus); }); strip.appendChild(plus);
  strip.appendChild(el('span', 'spacer'));
  if (LAY.groups.length < 2) { const b = el('button', 'act'); b.type = 'button'; b.title = 'Split right'; b.setAttribute('aria-label', 'Split right'); b.innerHTML = ICON.split; b.addEventListener('click', () => splitRight(i)); strip.appendChild(b); }
}
function markFocus() { groupEls.forEach((g, i) => g.classList.toggle('focus', i === LAY.focus && LAY.groups.length > 1)); }
function activePane(i) { const G = LAY.groups[i]; return G && G.active ? panes[G.key + '|' + G.active] : null; }
/* One element per (group, document). The first group to show a document gets the page's own element; every other group gets a fresh copy built from the section's source, with its own exercise cards and figures. */
const OWNER = {}, CLONES = {};
function instanceFor(key, id) {
  const it = ITEMS[id]; if (!it) return null; if (it.kind === 'view') return it.el;
  const ck = key + '|' + id; if (CLONES[ck]) return CLONES[ck];
  const held = OWNER[id] && OWNER[id] !== key && (() => { const G = groupByKey(OWNER[id]); return G && G.tabs.includes(id); })();
  if (!held) { OWNER[id] = key; return it.el; }
  const S = SEC[it.sec]; if (it.pending || !S || !S.src || !S.src[it.which]) return null;
  const t = document.createElement('template'); t.innerHTML = S.src[it.which]; const a = t.content.firstElementChild;
  if (a.dataset.math !== 'rendered') renderMath(a);
  mountExercises(it.sec, [a]); if (it.which === 'text') bootFigures(it.sec, a);
  return (CLONES[ck] = a);
}
function findEl(id) {
  const all = allEls(id); if (all.length < 2) return all[0] || null;
  const ap = activePane(LAY.focus); const f = ap && all.find((e) => ap.contains(e)); if (f) return f;
  return all.find((e) => { const p = e.closest('.pane'); return p && !p.hidden; }) || all.find((e) => e.closest('.pane')) || all[0];
}
function allEls(id) { return $$('[id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); }
function spyFocused() { spy(activePane(LAY.focus)); }
let urlSec = PAGE.section;
function syncUrl() {
  const sec = focusedSection(); if (sec === urlSec) return; const e = secEntry(sec); if (!e || !e.url) return; urlSec = sec;
  try { history.replaceState(null, '', ROOT + e.url); } catch (err) { }
  document.title = sec + ' ' + e.title + ' · ' + BOOK.title;
}

function render() {
  const scroll = {}; Object.entries(panes).forEach(([id, p]) => scroll[id] = p.scrollTop); const used = new Set();
  LAY.groups.forEach((G) => { G.tabs = G.tabs.filter((id) => item(id)); if (G.active && !G.tabs.includes(G.active)) G.active = G.tabs[0] || null; });
  ['left', 'right'].forEach((side) => {
    const S = LAY.sides[side], aside = $('#side-' + side), stack = $('.stack', aside);
    aside.hidden = !S.items.length || (narrowMQ.matches && overlay !== side); aside.style.width = S.width + 'px';
    const boxes = S.items.map(vboxFor); stack.replaceChildren(...boxes);
    boxes.forEach((b) => { const it = ITEMS[b.dataset.item]; used.add(it.el); if (it.el.parentNode !== b.body) b.body.appendChild(it.el); b.classList.toggle('collapsed', LAY.collapsed.includes(it.id)); });
  });
  const docs = $('#docs');
  LAY.groups.forEach((G, i) => {
    const g = groupFor(i); buildStrip(i, G);
    G.tabs.forEach((id) => {
      const p = paneFor(G.key, id); let inst = instanceFor(G.key, id);
      if (!inst) inst = (p.firstElementChild && p.firstElementChild.classList.contains('placeholder')) ? p.firstElementChild : el('article', 'placeholder', '<div class="loading">Loading ' + ITEMS[id].title + '…</div>');
      used.add(inst); if (inst.parentNode !== p) p.replaceChildren(inst);
      if (p.parentNode !== g.body) g.body.appendChild(p); p.dataset.group = i; p.hidden = id !== G.active;
    });
    $$('.pane', g.body).forEach((p) => { if (p.dataset.key !== G.key || !G.tabs.includes(p.dataset.tab)) p.remove(); });
    const empty = $('.empty', g.body); if (!G.tabs.length && !empty) g.body.appendChild(el('div', 'empty', 'Nothing open. Press + to open a section.')); else if (G.tabs.length && empty) empty.remove();
    if (g.parentNode !== docs || docs.children[i] !== g) docs.insertBefore(g, docs.children[i] || null);
  });
  while (docs.children.length > LAY.groups.length) docs.lastChild.remove();
  groupEls.length = LAY.groups.length;
  Object.values(ITEMS).forEach((it) => { if (used.has(it.el)) return; const home = it.kind === 'view' ? viewsHost : pool; if (it.el.parentNode !== home) home.appendChild(it.el); });
  Object.entries(CLONES).forEach(([ck, a]) => { if (!used.has(a)) { a.remove(); delete CLONES[ck]; } });
  Object.entries(panes).forEach(([pk, p]) => { if (!p.isConnected) delete panes[pk]; });
  Object.entries(panes).forEach(([id, p]) => { if (p.isConnected) p.scrollTop = scroll[id] || 0; });
  buildRails(); markFocus(); save(); buildViews(); syncUrl();
  requestAnimationFrame(() => { F.redrawAll(); spyFocused(); });
}

/* ----- settings, popovers, anchors ----- */
document.addEventListener('click', (e) => { ['#settings', '#picker'].forEach((s) => { const p = $(s); if (!p.hidden && !p.contains(e.target)) p.hidden = true; }); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#settings').hidden = true; $('#picker').hidden = true; } });
$('#reset-layout').addEventListener('click', () => { LAY = DEFAULT(); render(); });
document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#"]'); if (!a) return; const t = findEl(a.getAttribute('href').slice(1)); if (!t) return; e.preventDefault(); jump(t); });
$('#docs').addEventListener('pointerdown', () => { if (overlay) { overlay = null; render(); } });

/* ----- animations: one switch pauses every figure in every loaded section ----- */
const animToggle = $('#anim-toggle');
try { if (localStorage.getItem('omnistax-anim') === '0') animToggle.checked = false; } catch (e) { }
function applyAnim() { F.setPaused(!animToggle.checked); document.documentElement.classList.toggle('anim-off', !animToggle.checked); try { localStorage.setItem('omnistax-anim', animToggle.checked ? '1' : '0'); } catch (e) { } }
animToggle.addEventListener('change', applyAnim); applyAnim();

/* ----- colour coding and theme ----- */
const toggle = $('#cc-toggle');
try { const s = localStorage.getItem('omnistax-cc'); if (s === '0') toggle.checked = false; } catch (e) { }
function applyCC() { F.setCC(toggle.checked); document.documentElement.classList.toggle('cc', toggle.checked); try { localStorage.setItem('omnistax-cc', toggle.checked ? '1' : '0'); } catch (e) { } F.redrawAll(); }
toggle.addEventListener('change', applyCC);
const themeToggle = $('#theme-toggle');
const sysDark = matchMedia('(prefers-color-scheme: dark)');
function isDark() { const t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : sysDark.matches; }
function syncThemeToggle() { themeToggle.checked = isDark(); }
themeToggle.addEventListener('change', () => { const t = themeToggle.checked ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('omnistax-theme', t); } catch (e) { } });
sysDark.addEventListener('change', () => { syncThemeToggle(); F.redrawAll(); });
new MutationObserver(F.redrawAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
window.addEventListener('resize', F.redrawAll);

/* ----- boot ----- */
adoptFragment(pool);
// the page's own text is always open and active in the focused group
(function ensureOwn() { const id = 'doc:' + PAGE.section + '/text'; if (!where(id)) { LAY.groups[LAY.focus].tabs.unshift(id); } LAY.groups[LAY.focus].active = id; })();
applyCC(); syncThemeToggle();
render();
document.fonts && document.fonts.ready.then(F.redrawAll);
})();
