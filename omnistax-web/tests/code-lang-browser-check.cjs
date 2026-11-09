/* Browser check for code listings in several languages (METHOD decision 20 of the CS book; code/langs.ts,
   settings/codelang.ts, content/codeset.ts, fig/codepanel.ts): a code set in the text opens on Python with a
   button per language; choosing Java there shows the Java variant with its AI mark and switches the debugger
   figure's code panel on the same page to Java too; stepping the figure, then switching its panel back to
   Python, keeps the stop (the same watch, the line it rests on mapped back) and switches the text's set with
   it; the choice survives a reload, and the book's Theme page shows it.

   The book is a fixture this file writes.

       node tests/code-lang-browser-check.cjs --fixture /tmp/lang-books
       OMNISTAX_CONTENT_DIR=/tmp/lang-books npm run dev -- --port 4392
       node tests/code-lang-browser-check.cjs http://127.0.0.1:4392 [screenshot-dir]

   Playwright for Node: NODE_PATH may need to name the global node_modules. */
const fs = require('node:fs');
const path = require('node:path');

const BOOK = 'langbook';

/* ---------- the fixture book ---------- */

const PY = [
  'def pair_sum(nums, target):',
  '    i, j = 0, len(nums) - 1',
  '    while i < j:',
  '        s = nums[i] + nums[j]',
  '        if s == target:',
  '            return [i, j]',
  '        if s < target:',
  '            i += 1',
  '        else:',
  '            j -= 1',
  '    return None',
].join('\n');
const JAVA = [
  'int[] pairSum(int[] nums, int target) {',
  '    int i = 0;',
  '    int j = nums.length - 1;',
  '    while (i < j) {',
  '        int s = nums[i] + nums[j];',
  '        if (s == target) return new int[] {i, j};',
  '        if (s < target) {',
  '            i += 1;',
  '        } else {',
  '            j -= 1;',
  '        }',
  '    }',
  '    return null;',
  '}',
].join('\n');
const CPP = [
  'std::vector<int> pair_sum(const std::vector<int>& nums, int target) {',
  '    int i = 0, j = nums.size() - 1;',
  '    while (i < j) {',
  '        int s = nums[i] + nums[j];',
  '        if (s == target) return {i, j};',
  '        if (s < target) i += 1;',
  '        else j -= 1;',
  '    }',
  '    return {};',
  '}',
].join('\n');
const JS = [
  'function pairSum(nums, target) {',
  '  let i = 0, j = nums.length - 1;',
  '  while (i < j) {',
  '    const s = nums[i] + nums[j];',
  '    if (s === target) return [i, j];',
  '    if (s < target) i += 1;',
  '    else j -= 1;',
  '  }',
  '  return null;',
  '}',
].join('\n');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const AI = 'claude-opus-5-5 high';
const SET = `<div class="code-set"><pre data-lang="python"><code>${esc(PY)}</code></pre><pre data-lang="java" data-ai="${AI}"><code>${esc(JAVA)}</code></pre><pre data-lang="cpp" data-ai="${AI}"><code>${esc(CPP)}</code></pre><pre data-lang="javascript" data-ai="${AI}"><code>${esc(JS)}</code></pre></div>`;

/* The debugger figure: the same search in Python (whose lines the trace is recorded in) and Java, mapped. */
const FIGURES = `window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['1.1'] = function (root, F) {
  (function () {
    const A = [1, 2, 4, 7, 11];
    const run = (nums, target) => F.trace((at) => {
      let i = 0, j = nums.length - 1; at(2, { i, j });
      while (i < j) {
        at(3, { i, j });
        const s = nums[i] + nums[j]; at(4, { i, j, s });
        at(5, { i, j, s });
        if (s === target) { at(6, { i, j, s }); return; }
        at(7, { i, j, s });
        if (s < target) { i += 1; at(8, { i, j, s }); } else { j -= 1; at(10, { i, j, s }); }
      }
      at(11, { i, j });
    });
    const d = F.sim(root, 'sim-pair-sum', 300);
    const code = F.code(d, {
      src: { python: ${JSON.stringify(PY)}, java: ${JSON.stringify(JAVA)} },
      ai: { java: '${AI}' },
      lineMap: { java: { 1: 1, 2: [2, 3], 3: 4, 4: 5, 5: 6, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 13 } },
      blocks: [
        { id: 'init', lines: [2, 2], label: 'start at both ends', touches: ['i', 'j'] },
        { id: 'loop', lines: { python: [3, 10], java: [4, 12] }, label: 'one comparison', touches: ['i', 'j', 's'] },
        { id: 'move', lines: [7, 10], label: 'move the pointer on the wrong side', touches: ['i', 'j'] },
      ],
      refs: { i: () => F.cat(0), j: () => F.cat(1) },
    });
    F.debug(d, { code, inputs: [{ value: 'hit', label: 'hit', trace: run(A, 9) }, { value: 'miss', label: 'miss', trace: run(A, 10) }],
      draw: (g) => {
        const S = F.ds.strip(g.ctx, { y: 150, values: A });
        F.ds.pointer(g.ctx, S, [{ at: g.num('i'), name: 'i', color: F.cat(0) }, { at: g.num('j'), name: 'j', color: F.cat(1) }]);
      } });
  })();
};
`;

const writeFixture = (root) => {
  const dir = path.join(root, BOOK);
  const put = (rel, v) => {
    const f = path.join(dir, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, typeof v === 'string' ? v : `${JSON.stringify(v, null, 1)}\n`);
  };
  put('book.json', {
    id: BOOK, title: 'A Book in Four Languages', language: 'en', publisher: 'P', authors: ['A'], license: 'CC BY 4.0', openstax: 'https://example.org/pages/',
    highlights: { facts: true, refs: true, concepts: true, words: false, symbols: true, underlines: true },
    chapters: ['ch01'], intro: { module: 'm1', slug: 'preface' }, types: [],
    exercise_kinds: [{ id: 'problem', label: 'Problem' }],
    concepts: [{ id: 'two-pointers', kind: 'idea', section: '1.1', name: 'Two pointers', statement: 'Walk two indices toward each other.' }],
  });
  put('intro/section.json', { id: 'intro', module: 'm1', title: 'Preface', lead: '', built: '2026-11-09' });
  put('intro/text.html', '<section id="preface"><h2>Preface</h2><p>A book of code.</p></section>\n');
  put('ch01/chapter.json', { id: '1', dir: 'ch01', title: 'Arrays', sections: [{ id: '1.1', title: 'Two Pointers' }] });
  put('ch01/1.1/source.md', '# 1.1 Two Pointers\n');
  put('ch01/1.1/text.html', `<section id="two-pointers"><h2>Two pointers</h2><p>Walk two indices toward each other over a sorted array.</p>${SET}<figure class="sim" id="sim-pair-sum"><div class="sim-head"><span class="eyebrow">Sim</span><span>Step the two pointers toward each other.</span></div></figure></section>\n`);
  put('ch01/1.1/figures.js', FIGURES);
  put('ch01/1.1/section.json', {
    id: '1.1', chapter: '1', title: 'Two Pointers', lead: 'Two indices.', built: '2026-11-09',
    coverage: [{ span: 'two-pointers', concept: 'two-pointers', verb: 'introduces' }],
    figures: [{ id: 'sim-pair-sum', kind: 'sim' }],
  });
};

if (process.argv[2] === '--fixture') {
  writeFixture(process.argv[3]);
  console.log(`wrote ${path.join(process.argv[3], BOOK)}`);
  process.exit(0);
}

/* ---------- the check ---------- */

const { chromium } = require('playwright');
const BASE = (process.argv[2] ?? 'http://127.0.0.1:4392').replace(/\/+$/, '');
const SHOTS = process.argv[3] ?? null;
const assert = (cond, what) => { if (!cond) throw new Error(`FAILED: ${what}`); };
const ok = (what) => console.log(`ok: ${what}`);

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async (loc, name) => { if (SHOTS) await loc.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };

  await page.goto(`${BASE}/${BOOK}/ch01/1.1/`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');

  const pane = page.locator('.pane:not([hidden])');
  const set = pane.locator('.code-set').first();
  const fig = pane.locator('figure.sim').first();
  const panel = fig.locator('.cp');
  const readout = fig.locator('.readout');
  await set.waitFor({ state: 'visible', timeout: 15000 });
  await fig.locator('.dbg-row').waitFor({ state: 'visible', timeout: 15000 });
  const shownSet = async () => set.locator('pre:not([hidden])').getAttribute('data-lang');
  const pressed = async (loc) => loc.locator('button[aria-pressed="true"]').innerText();

  /* The text's set opens on Python, with the four buttons in the book's order. */
  assert(await set.locator('.cs-lang').allInnerTexts().then((t) => t.join(',')) === 'Python,Java,C++,JavaScript', 'the set offers Python, Java, C++, JavaScript in that order');
  assert(await shownSet() === 'python' && await pressed(set) === 'Python', 'the set opens on Python');
  assert(await set.locator('.cs-ai:not([hidden])').count() === 0, 'the source’s Python wears no AI mark');
  assert(await panel.getAttribute('data-lang') === 'python' && await pressed(panel.locator('.cp-head')) === 'Python', 'the figure’s panel opens on Python');
  ok('the text’s code set and the figure’s panel open on Python');
  await set.scrollIntoViewIfNeeded();
  await shot(set, 'lang-text-python');

  /* Java on the text's set: the set shows Java with its AI mark, and the figure follows. */
  await set.getByRole('button', { name: 'Java', exact: true }).click();
  assert(await shownSet() === 'java', 'a click on Java shows the Java variant');
  assert((await set.locator('pre:not([hidden])').innerText()).includes('int[] pairSum'), 'the Java code is shown');
  const mark = set.locator('.cs-ai:not([hidden]) .ai-mark');
  assert(await mark.count() === 1 && /Generated by Claude Opus 5\.5 · high effort/.test(await mark.getAttribute('title')), 'the translation wears the AI mark and its hover');
  assert(await panel.getAttribute('data-lang') === 'java', 'the figure’s panel follows the text’s set');
  assert(await panel.locator('.cp-line').count() === 14, 'the panel shows the Java code');
  assert(await page.evaluate((k) => localStorage.getItem(k), `omnistax-code-lang-${BOOK}`) === '"java"', 'the choice is kept for the book');
  ok('Java on the text’s set shows Java there, with the AI mark, and on the figure');
  await shot(set, 'lang-text-java');

  /* The figure in Java rests on its first stop, Python's line 2, which is Java's lines 2 and 3. Step once, then
     switch its panel to Python: the stop is kept. */
  await fig.scrollIntoViewIfNeeded();
  const lines = async (cls) => panel.locator(`.cp-line.${cls}`).evaluateAll((rs) => rs.map((r) => Number(r.dataset.line)));
  assert((await lines('at')).join() === '2,3', `the first stop rests on Java’s lines 2 and 3: ${await lines('at')}`);
  const step = fig.getByRole('button', { name: 'Step', exact: true });
  await step.click();
  await page.waitForTimeout(300);
  const watchJava = await readout.innerText();
  assert(/i = 0\s+j = 3\s+s = 12/.test(watchJava), `one step ends the first comparison: ${watchJava}`);
  assert((await lines('at')).join() === '10', `the Java panel rests on Java’s line 10: ${await lines('at')}`);
  assert((await lines('in')).join() === '4,5,6,7,8,9,10,11,12', `the band covers Java’s loop, lines 4–12: ${await lines('in')}`);
  await shot(fig, 'lang-figure-java');
  await panel.getByRole('button', { name: 'Python', exact: true }).click();
  await page.waitForTimeout(300);
  assert(await panel.getAttribute('data-lang') === 'python', 'the panel’s Python button shows Python');
  assert(await readout.innerText() === watchJava, `the switch keeps the stop: ${await readout.innerText()}`);
  assert((await lines('at')).join() === '10', `the Python panel rests on the same line, Python’s 10: ${await lines('at')}`);
  assert((await lines('in')).join() === '3,4,5,6,7,8,9,10', `the band covers Python’s loop, lines 3–10: ${await lines('in')}`);
  assert(await shownSet() === 'python', 'the text’s set follows the panel back to Python');
  await shot(fig, 'lang-figure-python');
  await step.click(); await page.waitForTimeout(300);
  assert(/i = 1\s+j = 3\s+s = 8/.test(await readout.innerText()), `stepping on after the switch goes on from the same stop: ${await readout.innerText()}`);
  ok('switching the figure’s panel keeps the stop and switches the text’s set');

  /* The choice survives a reload. */
  await panel.getByRole('button', { name: 'Java', exact: true }).click();
  await page.reload();
  await page.waitForLoadState('networkidle');
  await set.waitFor({ state: 'visible', timeout: 15000 });
  await fig.locator('.dbg-row').waitFor({ state: 'visible', timeout: 15000 });
  assert(await shownSet() === 'java' && await pressed(set) === 'Java', 'after a reload the text’s set shows Java');
  assert(await panel.getAttribute('data-lang') === 'java', 'after a reload the figure’s panel shows Java');
  ok('the choice survives a reload');

  /* The book's Theme page shows the choice, and changing it there changes the listings. */
  const opened = await page.evaluate(() => { const b = document.querySelector('button.tool.theme'); if (b) b.click(); return !!b; });
  assert(opened, 'the Explorer offers the book’s Theme page');
  const theme = page.locator('.colours .code-langs');
  await theme.waitFor({ state: 'visible', timeout: 10000 });
  assert(await theme.locator('[aria-checked="true"]').innerText() === 'Java', 'the Theme page shows Java');
  await theme.getByRole('radio', { name: 'C++', exact: true }).click();
  assert(await page.locator('.code-set').first().locator('pre:not([hidden])').getAttribute('data-lang') === 'cpp', 'C++ on the Theme page shows C++ on the text’s set');
  assert(await page.locator('figure.sim .cp').first().getAttribute('data-lang') === 'python', 'and the panel, which has no C++, shows Python');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'lang-theme-page.png') });
  ok('the Theme page shows the code language and sets it');

  const real = errors.filter((e) => !/favicon|ERR_INTERNET_DISCONNECTED/.test(e));
  assert(real.length === 0, `no page errors: ${real.join('\n')}`);
  ok('no page errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
