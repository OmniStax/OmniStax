/* Browser check for merging in the Sync view, against a faked GitHub API.

   Two devices changed the practice record and the library since they last
   agreed. The library merges on its own; the practice record holds two
   conflicts (the mastery target and the prompt note), which are settled one by
   one in the diff tab, VS Code style, while the attempts both sides logged
   merge without asking. The settled file goes up in one commit and comes down
   here.

   Run against a served site (Playwright for Node):
       node tests/sync-merge-browser-check.cjs http://127.0.0.1:4321 [screenshot.png] */
const { chromium } = require('playwright');
const { createHash } = require('node:crypto');

const BASE = (process.argv[2] ?? 'http://127.0.0.1:4321').replace(/\/+$/, '');
const SHOT = process.argv[3] ?? null;
const PAGE = '/college-physics-2e/ch01/1.1/';

/* A record's file as toRepo lays it out. */
const fileBytes = (v) => Buffer.from(`${JSON.stringify(v, null, 2)}\n`);
const sha = (b) => createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest('hex');
const practice = (attempts, target, note) => ({
  attempts: attempts.map((at) => ({ book: 'college-physics-2e', section: '1.1', ex: `e${at}`, at, ok: true, concepts: ['c'] })),
  shown: [], rounds: [], self: {},
  settings: { masteryTarget: target, freshnessDecay: true, startingHalfLife: 3, maxHalfLife: 240, order: 'mixed', includeFresh: false, generated: 'include', grading: 'reveal', promptNote: note, fresh: false, stopwatch: false, model: null },
});

const P = 'records/omnistax-practice-v2.json', L = 'records/omnistax-library-v1.json', T = 'records/omnistax-theme.json';
const base = { [P]: practice([1], 3, 'base note'), [L]: ['college-physics-2e'], [T]: 'dark' };
const mine = { [P]: practice([1, 2], 4, 'my note'), [L]: ['college-physics-2e', 'chemistry-2e'], [T]: 'dark' };
const theirs = { [P]: practice([1, 3], 5, 'their note'), [L]: ['college-physics-2e', 'calculus-1'], [T]: 'dark' };
const MANIFEST = { format: 'omnistax-sync', version: 2, exportedAt: '2026-10-20T12:00:00.000Z', books: [], files: [], images: [], labels: {} };

const blobs = new Map(), posted = new Map(), committed = [];
const tree = Object.entries({ 'omnistax.json': MANIFEST, ...theirs }).map(([path, v]) => { const b = fileBytes(v); blobs.set(sha(b), b); return { path, type: 'blob', sha: sha(b), size: b.length }; });
const agreed = Object.fromEntries(Object.entries(base).map(([path, v]) => { const b = fileBytes(v); blobs.set(sha(b), b); return [path, sha(b)]; }));

const github = async (route) => {
  const req = route.request(), url = req.url(), method = req.method();
  if (method === 'GET' && url.includes('/git/ref/heads/')) return route.fulfill({ json: { object: { sha: '1'.repeat(40) } } });
  if (method === 'GET' && url.includes('/git/commits/')) return route.fulfill({ json: { tree: { sha: '2'.repeat(40) } } });
  if (method === 'GET' && url.includes('/git/trees/')) return route.fulfill({ json: { truncated: false, tree } });
  if (method === 'GET' && url.includes('/git/blobs/')) { const b = blobs.get(url.split('/').pop()); return b ? route.fulfill({ body: b }) : route.fulfill({ status: 404, body: '{}' }); }
  if (method === 'POST' && url.endsWith('/git/blobs')) { const b = Buffer.from(JSON.parse(req.postData()).content, 'base64'); blobs.set(sha(b), b); posted.set(sha(b), b); return route.fulfill({ json: { sha: sha(b) } }); }
  if (method === 'POST' && url.endsWith('/git/trees')) { committed.push(...JSON.parse(req.postData()).tree); return route.fulfill({ json: { sha: '3'.repeat(40) } }); }
  if (method === 'POST' && url.endsWith('/git/commits')) return route.fulfill({ json: { sha: '4'.repeat(40) } });
  if (method === 'PATCH' && url.includes('/git/refs/')) return route.fulfill({ json: {} });
  return route.fulfill({ status: 500, body: '{}' });
};

const assert = (ok, what) => { if (!ok) throw new Error(`assertion failed: ${what}`); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('https://api.github.com/**', github);
  await page.goto(BASE + PAGE);
  await page.waitForSelector('.shell');
  await page.evaluate(([m, agreedBase]) => {
    localStorage.setItem('omnistax-theme', m.theme);
    localStorage.setItem('omnistax-practice-v2', JSON.stringify(m.practice));
    localStorage.setItem('omnistax-library-v1', JSON.stringify(m.library));
    localStorage.setItem('omnistax-sync-v1', JSON.stringify({ repo: 'chen/notes', branch: 'main', every: 0, last: { repo: 'chen/notes', branch: 'main', at: 1, base: agreedBase } }));
    localStorage.setItem('omnistax-github-token', 'github_pat_test');
  }, [{ theme: mine[T], practice: mine[P], library: mine[L] }, agreed]);
  await page.reload();
  await page.waitForSelector('.shell');
  await page.locator('#sync-btn').click();
  const view = page.locator('.sync');
  await view.locator('.status').filter({ hasText: 'changed in both' }).waitFor({ timeout: 30000 });

  const rows = {};
  for (const r of await view.locator('.file').all()) rows[await r.locator('.label').innerText()] = await r.locator('.state').innerText();
  assert(rows['omnistax-library-v1'] === 'merged', `library merged: ${JSON.stringify(rows)}`);
  assert(rows['omnistax-practice-v2'] === '2 conflicts', `practice has two conflicts: ${JSON.stringify(rows)}`);
  assert(!('omnistax-theme' in rows), 'an agreeing record never shows');
  const go = view.locator('.go').first();
  assert(await go.isDisabled() && (await go.innerText()).startsWith('Choose a version for 1 file'), `go waits: ${await go.innerText()}`);

  await view.locator('.file', { hasText: 'omnistax-practice-v2' }).click();
  const diff = page.locator('.diff');
  const bar = diff.locator('.bar');
  await bar.getByText('Conflict 1 of 2').waitFor({ timeout: 20000 });
  assert(await bar.getByText('0 of 2 resolved').isVisible(), 'counter');
  const conflicts = diff.locator('.conflict');
  assert(await conflicts.count() === 2, 'two conflict blocks');
  const first = conflicts.nth(0), second = conflicts.nth(1);
  assert((await first.locator('.side.mine').innerText()).includes('4,') && (await first.locator('.side.theirs').innerText()).includes('5,'), 'the target, each side');
  if (SHOT) await page.screenshot({ path: SHOT.replace('.png', '-folded.png') });
  await diff.locator('.fold').first().click();
  const shared = await diff.locator('.code.merge').innerText();
  assert(shared.includes('"e2"') && shared.includes('"e3"'), 'both sides’ attempts stand in the shared lines');
  if (SHOT) await page.screenshot({ path: SHOT.replace('.png', '-conflicts.png') });

  await first.getByRole('button', { name: 'Compare' }).click();
  await first.locator('.line.del').first().waitFor();
  if (SHOT) await page.screenshot({ path: SHOT.replace('.png', '-compare.png') });
  await first.getByRole('button', { name: 'Hide comparison' }).click();
  await first.getByRole('button', { name: 'Accept this device’s' }).click();
  assert(await first.locator('.chose').innerText() === 'This device’s kept', 'first settled');
  await bar.getByRole('button', { name: 'Next conflict' }).click();
  await bar.getByText('Conflict 2 of 2').waitFor();
  await second.getByRole('button', { name: 'Accept both' }).click();
  const status = diff.locator('.outcome .status');
  await status.filter({ hasText: 'appears twice' }).waitFor();
  const use = diff.getByRole('button', { name: 'Use this result' });
  assert(await use.isDisabled(), 'a result naming a key twice is refused');
  if (SHOT) await page.screenshot({ path: SHOT.replace('.png', '-refused.png') });
  await second.getByRole('button', { name: 'Undo' }).click();
  await second.getByRole('button', { name: 'Accept the repo’s' }).click();
  await status.filter({ hasText: 'Reads as this file should' }).waitFor();
  assert(await bar.getByText('2 of 2 resolved').isVisible(), 'all settled');

  await bar.getByRole('button', { name: 'Edit the result' }).click();
  const editor = diff.locator('textarea.edit');
  const text = await editor.inputValue();
  await editor.fill(text.replace('"promptNote"', 'promptNote'));
  await status.filter({ hasText: 'isn’t valid JSON' }).waitFor();
  await editor.fill(text);
  await status.filter({ hasText: 'Reads as this file should' }).waitFor();
  await bar.getByRole('button', { name: 'Back to the conflicts' }).click();
  await use.click();
  await status.filter({ hasText: 'goes to the repo and to this device' }).waitFor();
  if (SHOT) await page.screenshot({ path: SHOT });

  assert(await view.locator('.file', { hasText: 'omnistax-practice-v2' }).locator('.state').innerText() === 'resolved', 'the row says resolved');
  assert(await go.isEnabled() && (await go.innerText()).startsWith('Pull 2 and push'), `go: ${await go.innerText()}`);

  await Promise.all([page.waitForNavigation({ timeout: 30000 }), go.click()]);
  await page.waitForSelector('.shell');
  const sent = Object.fromEntries(committed.map((e) => [e.path, e.sha]));
  const up = JSON.parse(posted.get(sent[P]));
  assert(up.settings.masteryTarget === 4 && up.settings.promptNote === 'their note', `settled settings went up: ${JSON.stringify(up.settings)}`);
  assert(JSON.stringify(up.attempts.map((a) => a.at)) === '[1,2,3]', 'every attempt went up');
  assert(JSON.stringify(JSON.parse(posted.get(sent[L]))) === JSON.stringify(['college-physics-2e', 'chemistry-2e', 'calculus-1']), 'the library merge went up');
  const here = await page.evaluate(() => JSON.parse(localStorage.getItem('omnistax-practice-v2')));
  assert(here.settings.masteryTarget === 4 && here.attempts.length === 3, `and came down: ${JSON.stringify(here.settings)}`);
  const lib = await page.evaluate(() => JSON.parse(localStorage.getItem('omnistax-library-v1')));
  assert(JSON.stringify(lib) === JSON.stringify(['college-physics-2e', 'chemistry-2e', 'calculus-1']), `library here: ${JSON.stringify(lib)}`);
  const last = await page.evaluate(() => JSON.parse(localStorage.getItem('omnistax-sync-v1')).last.base);
  assert(last[P] === sent[P] && last[L] === sent[L], 'both sides agree on the merges');

  assert(!errors.length, errors.join('\n'));
  console.log('sync-merge-browser-check: ok');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
