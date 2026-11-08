/* Browser check for code exercises, with real Pyodide in Chromium (design
   docs/design-code-and-debugger.md §3): a code card in a practice session runs
   its visible tests, a correct linear solution submits as a pass and is
   recorded, a correct quadratic one is "correct but too slow" and a wrong one
   shows its failing test, neither recorded; a loop that never ends is stopped
   with a clear message and the next run works, as does a hang in C, which
   restarts Python; the calculator, which shares the Python worker, still
   answers after that; a program read from stdin runs;
   giving up records −1. Then the section's debugger figure steps, in both
   themes.

   The book is a fixture this file writes, since no cloned book has code
   exercises yet. Pyodide comes from cdn.jsdelivr.net, which must be reachable.

       node tests/code-browser-check.cjs --fixture /tmp/code-books
       OMNISTAX_CONTENT_DIR=/tmp/code-books npm run dev -- --port 4391
       node tests/code-browser-check.cjs http://127.0.0.1:4391 [screenshot-dir]

   Playwright for Node: NODE_PATH may need to name the global node_modules. */
const fs = require('node:fs');
const path = require('node:path');

const BOOK = 'codebook';

/* ---------- the fixture book ---------- */

const LINEAR = [
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
  '',
].join('\n');
const QUADRATIC = [
  'def pair_sum(nums, target):',
  '    for i in range(len(nums)):',
  '        for j in range(i + 1, len(nums)):',
  '            if nums[i] + nums[j] == target:',
  '                return [i, j]',
  '    return None',
  '',
].join('\n');
const WRONG = 'def pair_sum(nums, target):\n    return [0, len(nums) - 1]\n';
const FOREVER = 'def pair_sum(nums, target):\n    while True: pass\n';
/* one multiplication of huge integers, in C: no Python line runs while it does */
const HANG = 'def pair_sum(nums, target):\n    return len(str(7 ** (10 ** 9)))\n';
const STARTER = 'def pair_sum(nums, target):\n    return None\n';

/* A debugger figure: the linear reference stepped block by block beside its strip. */
const FIGURES = `window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['1.1'] = function (root, F) {
  (function () {
    const SRC = ${JSON.stringify(LINEAR.trimEnd())};
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
    const code = F.code(d, { lang: 'python', src: SRC, blocks: [
      { id: 'init', lines: [2, 2], label: 'start at both ends', touches: ['i', 'j'] },
      { id: 'loop', lines: [3, 10], label: 'one comparison', touches: ['i', 'j', 's'] },
      { id: 'move', lines: [7, 10], label: 'move the pointer on the wrong side', touches: ['i', 'j'] },
    ] });
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
    id: BOOK, title: 'A Code Book', language: 'en', publisher: 'P', authors: ['A'], license: 'CC BY 4.0', openstax: 'https://example.org/pages/',
    highlights: { facts: true, refs: true, concepts: true, words: false, symbols: true, underlines: true },
    chapters: ['ch01'], intro: { module: 'm1', slug: 'preface' }, types: [],
    exercise_kinds: [{ id: 'problem', label: 'Problem' }],
    concepts: [{ id: 'two-pointers', kind: 'idea', section: '1.1', name: 'Two pointers', statement: 'Walk two indices toward each other.' }],
    sheets: [{ id: 'calculator', title: 'Calculator', kind: 'cas', file: 'sheets/calculator.json' }],
  });
  put('sheets/calculator.json', { kind: 'cas', id: 'calculator', title: 'Calculator' });
  put('intro/section.json', { id: 'intro', module: 'm1', title: 'Preface', lead: '', built: '2026-11-08' });
  put('intro/text.html', '<section id="preface"><h2>Preface</h2><p>A book of code.</p></section>\n');
  put('ch01/chapter.json', { id: '1', dir: 'ch01', title: 'Arrays', sections: [{ id: '1.1', title: 'Two Pointers' }] });
  put('ch01/1.1/source.md', '# 1.1 Two Pointers\n\nEXERCISE x-1\n\nEXERCISE x-2\n');
  put('ch01/1.1/text.html', '<section id="two-pointers"><h2>Two pointers</h2><p>Walk two indices toward each other over a sorted array.</p><figure class="sim" id="sim-pair-sum"><div class="sim-head"><span class="eyebrow">Sim</span><span>Step the two pointers toward each other.</span></div></figure></section>\n');
  put('ch01/1.1/figures.js', FIGURES);
  put('ch01/1.1/section.json', {
    id: '1.1', chapter: '1', title: 'Two Pointers', lead: 'Two indices.', built: '2026-11-08',
    coverage: [{ span: 'two-pointers', concept: 'two-pointers', verb: 'introduces' }],
    figures: [{ id: 'sim-pair-sum', kind: 'sim' }],
    exercises: [
      {
        id: 'p1', source_id: 'x-1', kind: 'problem', bloom: 'Apply', place: { at: 'end' },
        prompt: 'Given a sorted list <code>nums</code> and a <code>target</code>, return the indices <code>[i, j]</code>, <code>i &lt; j</code>, of two entries summing to the target, or <code>None</code>.',
        answer: {
          type: 'code',
          python: { entry: 'pair_sum', starter: STARTER, reference: LINEAR, generated_by: 'ai' },
          tests: [
            { args: [[1, 2, 4, 7, 11], 9], expect: [1, 3], visible: true, generated_by: 'ai' },
            { args: [[1, 3], 5], expect: null, visible: true, generated_by: 'ai' },
            { args: [[2, 5, 8, 9], 17], expect: [2, 3], generated_by: 'ai' },
            { args: [[0, 1], 1], expect: [0, 1], generated_by: 'ai' },
          ],
          bound: 'n', grow: '(n, rand) => [Array.from({ length: n }, (_, i) => 2 * i), -1]',
          hint: 'Start one index at each end.', generated_by: 'ai',
        },
      },
      {
        id: 'p2', source_id: 'x-2', kind: 'problem', bloom: 'Apply', place: { at: 'end' },
        prompt: 'Read two integers on one line and print their sum.',
        answer: {
          type: 'code',
          python: { starter: 'a, b = map(int, input().split())\n', reference: 'a, b = map(int, input().split())\nprint(a + b)\n', generated_by: 'ai' },
          tests: [{ stdin: '1 2\n', stdout: '3\n', visible: true, generated_by: 'ai' }, { stdin: '5 5', stdout: '10 ', generated_by: 'ai' }],
          compare: 'tokens', generated_by: 'ai',
        },
      },
    ],
    exercise_concepts: [{ exercise: 'p1', concept: 'two-pointers' }, { exercise: 'p2', concept: 'two-pointers' }],
  });
};

if (process.argv[2] === '--fixture') {
  writeFixture(process.argv[3]);
  console.log(`wrote ${path.join(process.argv[3], BOOK)}`);
  process.exit(0);
}

/* ---------- the check ---------- */

const { chromium } = require('playwright');
const BASE = (process.argv[2] ?? 'http://127.0.0.1:4391').replace(/\/+$/, '');
const SHOTS = process.argv[3] ?? null;
const assert = (cond, what) => { if (!cond) throw new Error(`FAILED: ${what}`); };
const ok = (what) => console.log(`ok: ${what}`);

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };
  const attempts = () => page.evaluate(() => JSON.parse(localStorage.getItem('omnistax-practice') ?? '{"attempts":[]}').attempts ?? []);

  await page.goto(`${BASE}/${BOOK}/ch01/1.1/`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => { window.__sameDocument = true; });

  /* A practice session of the section's two exercises, from the book only. */
  await page.getByRole('button', { name: /Practice this section/ }).click();
  const pane = page.locator('.pane:not([hidden])');
  await pane.getByRole('radio', { name: 'Book only', exact: true }).click();
  await pane.getByRole('button', { name: /^Start: 2 book exercises$/ }).click();

  const card = pane.locator('.exercise').first();
  const editor = card.locator('.cm-content');
  await editor.waitFor({ state: 'visible', timeout: 15000 });
  assert((await editor.innerText()).includes('def pair_sum'), 'the editor opens with the starter');
  ok('the card renders with the editor and the starter');

  const results = card.locator('.code-answer .results');
  const idle = () => card.getByRole('button', { name: 'Run', exact: true }).and(page.locator(':enabled')).waitFor({ timeout: 120000 });
  const type = async (code) => {
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(code);
    assert((await editor.innerText()).replace(/​/g, '').trim() === code.trim(), `the editor holds what was typed:\n${code}`);
  };
  const press = async (name) => {
    await card.getByRole('button', { name, exact: true }).click();
    await results.locator('.note').filter({ hasText: /Running|Loading Python|Checking how/ }).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
    await idle();
  };

  /* Run on the starter: the visible tests, one by one; nothing recorded. */
  const t0 = Date.now();
  await press('Run');
  const rows = results.locator('ol.tests > li');
  assert(await rows.count() === 2, `Run shows the two visible tests (${await rows.count()})`);
  assert(!(await rows.nth(0).getAttribute('class') ?? '').includes('ok') && (await rows.nth(1).getAttribute('class') ?? '').includes('ok'), 'the starter fails test 1 and passes test 2');
  assert((await rows.nth(0).innerText()).includes('Expected'), 'a failing visible test shows what was expected');
  assert((await attempts()).length === 0, 'Run records nothing');
  ok(`Run on the starter shows the visible tests (${((Date.now() - t0) / 1000).toFixed(1)}s, Python cold)`);
  await shot('code-1-run-starter');

  /* A wrong solution: the failing test, nothing recorded, the card still open. */
  await type(WRONG);
  await press('Submit');
  const verdict = results.locator('.verdict');
  assert(/^Test 1 fails\./.test(await verdict.innerText()), `a wrong submit names the failing test: ${await verdict.innerText()}`);
  assert((await results.locator('dl.detail').innerText()).includes('[0,4]'), 'the failing test shows the reader\'s value');
  assert((await attempts()).length === 0, 'a wrong submit records nothing');
  ok('a wrong solution shows the failing test and records nothing');
  await shot('code-2-wrong');

  /* A correct quadratic solution: correct but too slow, nothing recorded. */
  await type(QUADRATIC);
  await press('Submit');
  const slow = await verdict.innerText();
  assert(/^Correct\. Your solution makes about n² steps; this problem wants n\./.test(slow), `a quadratic submit is too slow: ${slow}`);
  assert((await results.innerText()).includes('2 of 2 hidden tests passed'), 'the hidden tests are counted');
  assert((await attempts()).length === 0, 'a too-slow submit records nothing');
  assert(await card.getByRole('button', { name: 'Submit', exact: true }).count() === 1, 'the card stays open after a too-slow submit');
  ok('a correct quadratic solution is "correct but too slow" and records nothing');
  await shot('code-3-slow');

  /* A loop that never ends: stopped with a clear message, and the next run works. */
  await type(FOREVER);
  const t1 = Date.now();
  await press('Run');
  const stopped = await results.innerText();
  assert(/ran past the time limit/.test(stopped), `an endless loop is stopped with a clear message: ${stopped}`);
  ok(`while True: pass is stopped after ${((Date.now() - t1) / 1000).toFixed(1)}s: ${stopped.replace(/\s+/g, ' ').trim()}`);
  await shot('code-4-timeout');
  await type(STARTER);
  await press('Run');
  assert(await rows.count() === 2, 'the run after a timeout shows the tests again');
  ok('the next Run after the timeout works');

  /* A hang in C, which the soft limit cannot see: the host's deadline restarts Python, and the next run works. */
  await type(HANG);
  const t3 = Date.now();
  await press('Run');
  const killed = await results.innerText();
  assert(/ran past the time limit, so Python was restarted/.test(killed), `a hang in C restarts Python: ${killed}`);
  ok(`a hang in C is stopped after ${((Date.now() - t3) / 1000).toFixed(1)}s: ${killed.replace(/\s+/g, ' ').trim()}`);
  await shot('code-4b-killed');
  await type(STARTER);
  await press('Run');
  assert(await rows.count() === 2, 'the run after a restart shows the tests again');
  ok('the next Run after the restart works');

  /* The calculator shares the worker: it still answers after the timeout. */
  await page.locator('.sidebar').getByText('Calculator', { exact: true }).click();
  const cas = pane.locator('.cas');
  await cas.waitFor({ state: 'visible', timeout: 15000 });
  await cas.locator('input[type="text"]').first().fill('x^2');
  const t2 = Date.now();
  await cas.getByRole('button', { name: 'Integrate', exact: true }).click();
  await cas.locator('.answer .result').waitFor({ state: 'visible', timeout: 120000 });
  const result = await cas.locator('.answer .result annotation').first().textContent().catch(() => null) ?? await cas.locator('.answer .result').innerText();
  assert(/x\^\{?3\}?/.test(result) && /3/.test(result), `the calculator integrates x^2: ${result}`);
  assert(await page.evaluate(() => window.__sameDocument === true), 'the calculator opened in the same document, so in the same worker');
  ok(`the calculator answers after the code timeout (${((Date.now() - t2) / 1000).toFixed(1)}s, SymPy cold): ${result}`);
  await shot('code-5-calculator');

  /* Back to the card: a correct linear solution passes, is recorded and locks the card. */
  await page.locator('.tabs, [role="tablist"]').first().getByText('Exercises', { exact: true }).click();
  await editor.waitFor({ state: 'visible' });
  await type(LINEAR);
  await press('Submit');
  const passed = await verdict.innerText();
  assert(/^All tests pass, in about n steps\./.test(passed), `a linear submit passes: ${passed}`);
  const after = await attempts();
  assert(after.length === 1 && after[0].ok === true && after[0].ex === 'p1' && after[0].concepts.includes('two-pointers'), `a pass records +1: ${JSON.stringify(after)}`);
  assert(await card.getByRole('button', { name: 'Submit', exact: true }).count() === 0, 'a pass locks the card');
  ok(`a correct linear solution passes and is recorded: ${JSON.stringify(after[0])}`);
  await shot('code-6-pass');

  /* The stdin exercise: Run shows the test, then giving up records −1 and shows the solution. */
  await pane.getByRole('button', { name: /^Next/ }).click();
  const card2 = pane.locator('.exercise').first();
  await card2.locator('.cm-content').waitFor({ state: 'visible' });
  assert((await card2.locator('.cm-content').innerText()).includes('input().split()'), 'the second card is the stdin exercise');
  await card2.getByRole('button', { name: 'Run', exact: true }).click();
  const rows2 = card2.locator('ol.tests > li');
  await rows2.first().waitFor({ state: 'visible', timeout: 30000 });
  const stdinRow = await rows2.first().innerText();
  assert(!(await rows2.first().getAttribute('class') ?? '').includes('ok') && stdinRow.includes('Expected'), `the stdin starter prints nothing and fails: ${stdinRow}`);
  ok('a stdin program runs and its failing test shows');
  await card2.getByRole('button', { name: 'Give up and show the solution', exact: true }).click();
  await card2.locator('.solution-block').waitFor({ state: 'visible', timeout: 5000 });
  const all = await attempts();
  assert(all.length === 2 && all[1].ok === false && all[1].ex === 'p2', `giving up records −1: ${JSON.stringify(all)}`);
  assert(await card2.getByRole('button', { name: 'Submit', exact: true }).count() === 0, 'giving up locks the card');
  assert((await card2.locator('.solution-block').innerText()).includes('print(a + b)'), 'giving up shows the reference');
  ok('Give up records −1 and shows the solution');
  await shot('code-7-gave-up');

  const real = errors.filter((e) => !/favicon|ERR_INTERNET_DISCONNECTED/.test(e));
  assert(real.length === 0, `no page errors: ${real.join('\n')}`);
  ok('no page errors');

  /* The debugger figure of the section, in both themes: the code beside the strip, stepped. */
  for (const scheme of ['light', 'dark']) {
    const fp = await browser.newPage({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 1, colorScheme: scheme, reducedMotion: 'reduce' });
    const ferrs = [];
    fp.on('pageerror', (e) => ferrs.push(String(e)));
    fp.on('console', (m) => { if (m.type() === 'error') ferrs.push(m.text()); });
    await fp.goto(`${BASE}/${BOOK}/ch01/1.1/`);
    const fig = fp.locator('.pane:not([hidden]) figure.sim').first();
    await fig.locator('.dbg-row').waitFor({ state: 'visible', timeout: 15000 });
    await fig.scrollIntoViewIfNeeded();
    const readout = fig.locator('.readout');
    assert(/i = 0\s+j = 4/.test(await readout.innerText()), `the debugger opens on its first stop: ${await readout.innerText()}`);
    const step = fig.getByRole('button', { name: 'Step', exact: true });
    for (let i = 0; i < 3; i++) await step.click();
    await fp.waitForTimeout(300);
    assert(/i = 1\s+j = 3\s+s = 9/.test(await readout.innerText()), `three steps reach the pair: ${await readout.innerText()}`);
    assert(await step.isDisabled(), 'the last stop disables Step');
    if (SHOTS) await fig.screenshot({ path: path.join(SHOTS, `debug-${scheme}.png`) });
    await fig.getByText('miss', { exact: true }).click();
    await fp.waitForTimeout(300);
    assert(/i = 0\s+j = 4/.test(await readout.innerText()), `another input starts the trace again: ${await readout.innerText()}`);
    assert(ferrs.length === 0, `no page errors on the figure (${scheme}): ${ferrs.join('\n')}`);
    ok(`the debugger figure steps in the ${scheme} theme`);
    await fp.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
