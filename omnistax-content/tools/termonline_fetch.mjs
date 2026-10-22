// The fetch engine of termonline.py: looks terms up through the site's own
// search page in a headless Chromium, since the JSON endpoint answers empty to
// a bare client, and writes what the page received into the cache file.
//
//   node omnistax-content/tools/termonline_fetch.mjs <cache.json> <terms.json> [pace-ms]
//
// terms.json is a JSON list of terms. Each is navigated to once (twice when
// the first answer is empty, the site answers empty at random), paced, and the
// cache gains "<term lowercased>": [entries]. Entries: {cn, en, vocab, year, id,
// definition}. The site is a shared national service: the pace stays gentle.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';

const [cachePath, termsPath, paceArg] = process.argv.slice(2);
const pace = Number(paceArg || 4000);
const terms = JSON.parse(readFileSync(termsPath, 'utf8'));
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
const save = () => { writeFileSync(cachePath + '.tmp', JSON.stringify(cache, null, 0)); renameSync(cachePath + '.tmp', cachePath); };
const vocabOf = (w) => {
  for (const key of ['quote1', 'quote2']) {
    const q = w[key] || '';
    if (q.includes('.')) { const v = q.split('.').slice(1).join('.').split('[')[0].trim(); if (v) return v; }
  }
  return '';
};
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext()).newPage();
let done = 0;
for (const term of terms) {
  const key = term.trim().toLowerCase();
  if (cache[key] && cache[key].length) { continue; }
  let entries = [];
  for (let attempt = 0; attempt < 3 && !entries.length; attempt++) {
    // The page's own search primes the term at the API; after it, in-page
    // fetches of the same endpoint answer, and a vocabulary filter brings the
    // physics entries that the unfiltered first page buries.
    const waitReq = page.waitForRequest(/tmWord\/allSearch/, { timeout: 30000 }).catch(() => null);
    let primed = null;
    try {
      await page.goto('https://www.termonline.cn/search?searchText=' + encodeURIComponent(term), { waitUntil: 'load', timeout: 60000 });
      primed = await waitReq;
      await page.waitForTimeout(2500);
    } catch (e) { console.error(`${term}: ${e.message.split('\n')[0]}`); }
    if (primed) {
      const got = await page.evaluate(async (u) => {
        const urls = [u.replace('sources=&', 'sources=' + encodeURIComponent('物理学名词') + '&').replace('pageSize=20', 'pageSize=100'),
                      u.replace('sources=&', 'sources=' + encodeURIComponent('力学名词') + '&').replace('pageSize=20', 'pageSize=100'),
                      u.replace('pageSize=20', 'pageSize=200')];
        const out = []; const ids = new Set();
        for (const url of urls) {
          try {
            const j = await (await fetch(url)).json();
            for (const w of j.result.searchResult[0].result.tmWordList || []) { if (!ids.has(w.id)) { ids.add(w.id); out.push(w); } }
          } catch {}
        }
        return out;
      }, primed.url()).catch(() => []);
      if (got.length) entries = got.map(w => ({ cn: w.cn, en: w.en, vocab: vocabOf(w), year: w.pubYear ?? w.year ?? null, id: w.id, definition: w.definition ?? null }));
    }
    if (!entries.length) await page.waitForTimeout(pace * (attempt + 1));
  }
  cache[key] = entries;
  save();
  done++;
  console.log(`${term}: ${entries.length}`);
  await page.waitForTimeout(pace);
}
await browser.close();
console.log(`fetched ${done} of ${terms.length}`);
