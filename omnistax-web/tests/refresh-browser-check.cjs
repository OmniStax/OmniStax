/* Browser check for what a reload gives back: the place a page was being read
   at, a pomodoro under way (and the two ways one is let go: screen lock's
   grace, and a reload that took too long), a chat's unsent draft, the undo
   history of a note and of a drawing, and how a concept map was left.

       python3 -m http.server -d dist 4337
       node tests/refresh-browser-check.cjs http://127.0.0.1:4337

   Playwright for Node: NODE_PATH may need to name the global node_modules. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'http://127.0.0.1:4337').replace(/\/$/, '');
const PATH = '/college-physics-2e/ch01/1.1/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1300, height: 850 } });
  /* A reload that takes a while: the page that comes back reads a clock set forward by what the test asked for. */
  await context.addInitScript(() => {
    const skew = Number(sessionStorage.getItem('test-skew') || 0);
    if (skew) { const real = Date.now.bind(Date); Date.now = () => real() + skew; }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const reload = async (skew = 0) => {
    await page.evaluate((s) => { if (s) sessionStorage.setItem('test-skew', String(s)); else sessionStorage.removeItem('test-skew'); }, skew);
    await page.reload();
    await page.waitForSelector('.shell');
  };
  const palette = async (command) => {
    await page.keyboard.press('Control+Shift+P');
    await page.keyboard.type(command);
    await sleep(300);
    await page.keyboard.press('Enter');
  };
  await page.goto(BASE + PATH);
  await page.waitForSelector('.shell');
  await page.waitForSelector('.pane:not([hidden]) article[data-doc]');

  /* ── the reading place ── */
  const pane = page.locator('.pane:not([hidden])').first();
  await sleep(1500);
  await pane.evaluate((p) => p.scrollTo({ top: 2400, behavior: 'instant' }));
  await sleep(700);
  const where = () => pane.evaluate((p) => {
    const top = p.getBoundingClientRect().top;
    const els = [...p.querySelectorAll('[data-doc] [id]')].filter((e) => e instanceof HTMLElement && e.getBoundingClientRect().height > 0);
    const at = els.filter((e) => e.getBoundingClientRect().top <= top + 1).pop();
    return { top: p.scrollTop, at: at && at.id, off: at && Math.round(at.getBoundingClientRect().top - top) };
  });
  const left = await where();
  assert.ok(left.top > 2000, `the pane scrolled: ${left.top}`);
  await reload();
  await sleep(3000);
  const back = await where();
  assert.equal(back.at, left.at, 'the same element stands at the top of the pane');
  assert.ok(Math.abs(back.off - left.off) <= 2, `at the same offset: ${back.off} vs ${left.off}`);
  console.log('reading place: ok', left, back);

  /* ── the pomodoro ── */
  const phase = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('omnistax-pomodoro-session')).session.phase);
  await page.getByRole('button', { name: 'Pomodoro', exact: true }).first().click();
  await page.waitForSelector('.pom .face');
  await page.locator('.pom').getByRole('button', { name: 'Start', exact: true }).click();
  await sleep(2200);
  await reload();
  await page.waitForSelector('.pom .face');
  await page.locator('.pom').getByRole('button', { name: 'Pause', exact: true }).waitFor();
  const clock = await page.locator('.pom .digits').innerText();
  assert.match(clock, /^24:5\d$/, `the clock went on counting through the reload: ${clock}`);
  /* paused, it comes back however long the reload took */
  await page.locator('.pom').getByRole('button', { name: 'Pause', exact: true }).click();
  await reload(3_600_000);
  await page.locator('.pom').getByRole('button', { name: 'Resume', exact: true }).click();
  await sleep(1200);
  /* a reload that took two minutes lets a running one go */
  await reload(3_600_000 + 120_000);
  await page.locator('.pom').getByRole('button', { name: 'Start', exact: true }).waitFor();
  assert.equal(await phase(), 'idle');
  assert.equal(await page.locator('.pom .lost').count(), 0);
  /* under screen lock, a reload inside the grace keeps it and one past it loses it */
  await reload();
  await page.evaluate(() => localStorage.setItem('omnistax-pomodoro-lock', '1'));
  await reload();
  await page.locator('.pom').getByRole('button', { name: 'Start', exact: true }).click();
  await sleep(500);
  await reload();
  await page.locator('.pom').getByRole('button', { name: 'Pause', exact: true }).waitFor();
  await reload(30_000);
  await page.locator('.pom .lost').waitFor();
  assert.equal(await phase(), 'idle');
  await page.evaluate(() => localStorage.setItem('omnistax-pomodoro-lock', '0'));
  await reload();
  console.log('pomodoro: ok');

  /* ── a chat's draft ── */
  await palette('New chat');
  const field = page.locator('.pane:not([hidden]) textarea').first();
  await field.waitFor();
  await field.fill('why does the pendulum');
  await sleep(600);
  await reload();
  await page.locator('.pane:not([hidden]) textarea').first().waitFor();
  assert.equal(await page.locator('.pane:not([hidden]) textarea').first().inputValue(), 'why does the pendulum');
  console.log('chat draft: ok');

  /* ── a chat opens on its latest words, and an answer the reload cut off reads as stopped ── */
  await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('omnistax-chats');
    r.onsuccess = () => {
      const store = r.result.transaction('chats', 'readwrite').objectStore('chats');
      const q = store.getAll();
      q.onsuccess = () => {
        const chat = q.result[q.result.length - 1];
        let parent = chat.root;
        for (let i = 0; i < 40; i += 1) {
          const id = `m${String(i).padStart(7, '0')}`, user = i % 2 === 0;
          chat.messages[id] = { id, parent, role: user ? 'user' : 'assistant', text: `${user ? 'Question' : 'Answer'} ${i}. `.repeat(user ? 1 : 40), chips: [], at: chat.created + i + 1, state: i === 39 ? 'streaming' : 'done', ...(user ? {} : { model: 'm' }) };
          parent = id;
        }
        chat.leaf = parent;
        store.put(chat).onsuccess = () => { r.result.close(); res(null); };
      };
    };
  }));
  await reload();
  const said = page.locator('.pane:not([hidden]) .messages').first();
  await said.locator('.bubble').first().waitFor();
  await sleep(1500);
  const end = await said.evaluate((m) => ({ gap: m.scrollHeight - m.clientHeight - m.scrollTop, tall: m.scrollHeight > m.clientHeight * 2 }));
  assert.ok(end.tall && end.gap <= 2, `the transcript stands at its end: ${JSON.stringify(end)}`);
  assert.equal(await said.locator('.waiting').count(), 0);
  assert.equal(await said.locator('.bubble').last().innerText().then((t) => t.includes('Answer 39.')), true);
  console.log('chat end: ok');

  /* ── a note's undo history ── */
  await palette('New note');
  const cm = page.locator('.pane:not([hidden]) .cm-content').first();
  await cm.waitFor();
  await cm.click();
  await page.keyboard.type('first line');
  await sleep(1200);
  await page.keyboard.type(' and more');
  await sleep(900);
  await reload();
  const body = async () => (await page.locator('.pane:not([hidden]) .cm-content').count())
    ? page.locator('.pane:not([hidden]) .cm-content').first().innerText()
    : null;
  if ((await body()) === null) await page.keyboard.press('Control+E');
  await page.locator('.pane:not([hidden]) .cm-content').first().waitFor();
  assert.equal((await body()).trim(), 'first line and more');
  await page.locator('.pane:not([hidden]) .cm-content').first().click();
  await page.keyboard.press('Control+Z');
  await sleep(300);
  const undone = (await body()).trim();
  assert.notEqual(undone, 'first line and more', 'Ctrl+Z after the reload takes a step back');
  console.log('note undo: ok ->', JSON.stringify(undone));

  /* ── a drawing's undo history ── */
  await palette('New drawing');
  const canvas = page.locator('.pane:not([hidden]) canvas').first();
  await canvas.waitFor();
  const box = await canvas.boundingBox();
  const stroke = async (dx) => {
    await page.mouse.move(box.x + 200 + dx, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 260 + dx, box.y + 260, { steps: 6 });
    await page.mouse.up();
    await sleep(200);
  };
  await stroke(0); await stroke(120);
  await sleep(1200);
  const items = () => page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('omnistax-drawings');
    r.onsuccess = () => { const q = r.result.transaction('drawings').objectStore('drawings').getAll(); q.onsuccess = () => { r.result.close(); res(q.result.map((d) => d.items.length)); }; };
  }));
  const drawn = await items();
  assert.ok(drawn.includes(2), `two strokes were written: ${drawn}`);
  await reload();
  await page.locator('.pane:not([hidden]) canvas').first().waitFor();
  await sleep(800);
  const undo = page.locator('.pane:not([hidden])').getByRole('button', { name: 'Undo', exact: true });
  assert.equal(await undo.isDisabled(), false, 'the steps came back with the drawing');
  await undo.click();
  await sleep(1200);
  const after = await items();
  assert.ok(after.includes(1) && !after.includes(2), `Undo after the reload takes a stroke back: ${after}`);
  console.log('drawing undo: ok');

  /* ── how a concept map was left ── */
  await page.getByRole('button', { name: 'Concept map', exact: true }).first().click();
  const map = page.locator('.map').first();
  await map.locator('svg .node').first().waitFor();
  await sleep(800);
  const svg = map.locator('svg').first();
  const sb = await svg.boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.mouse.wheel(0, -400);
  await sleep(300);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width / 2 + 60, sb.y + sb.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  await map.locator('svg .node').first().click();
  await page.locator('.kind').first().click();
  const view = () => page.evaluate(() => ({
    tf: document.querySelector('.map svg > g').getAttribute('transform'),
    off: [...document.querySelectorAll('.kind')].map((k) => k.classList.contains('off')),
    picked: Object.values(JSON.parse(localStorage.getItem('omnistax-map-views') || '{}').picked || {}),
  }));
  await sleep(900);
  const was = await view();
  assert.ok(was.off[0] && was.picked.length === 1, JSON.stringify(was));
  await reload();
  await page.locator('.map svg .node').first().waitFor();
  await sleep(1200);
  const now = await view();
  assert.deepEqual(now, was, 'the map stands as it was left');
  console.log('concept map: ok', was.tf);

  assert.deepEqual(errors, [], 'no page errors');
  await browser.close();
  console.log('refresh: all ok');
})().catch((e) => { console.error(e); process.exit(1); });
