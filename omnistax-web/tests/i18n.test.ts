import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGS, LOCALES, LOCALE_NAMES, currentLocale, localeOfQuery, en, format, matchLocale, onLocaleChange, parseLocale, setCurrentLocale, t, tIn, templateShape, type MessageKey } from '../src/lib/i18n/index';
import { AREAS } from '../src/lib/i18n/en/index';
import { aboutHtml } from '../src/lib/content/pages';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AREAS as ZH_AREAS } from '../src/lib/i18n/zh-CN/index';

const KEYS = Object.keys(en) as MessageKey[];

test('the merged English catalog holds every key of every area file, none twice', () => {
  const sum = Object.values(AREAS).reduce((n, a) => n + Object.keys(a).length, 0);
  assert.equal(KEYS.length, sum);
  const zhSum = Object.values(ZH_AREAS).reduce((n, a) => n + Object.keys(a).length, 0);
  assert.equal(Object.keys(CATALOGS['zh-CN']).length, zhSum);
});

test('every key of an area file starts with the area or a component of it, and is dotted', () => {
  for (const [area, keys] of Object.entries(AREAS)) {
    for (const k of Object.keys(keys)) assert.match(k, /^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)+$/, `${area}: ${k}`);
  }
});

test('every locale has every key and no empty value', () => {
  for (const l of LOCALES) {
    const c = CATALOGS[l];
    assert.deepEqual(Object.keys(c).sort(), [...KEYS].sort(), l);
    for (const k of KEYS) assert.ok(c[k].trim().length > 0, `${l} ${k} is empty`);
  }
});

test('every translation asks for the placeholders and plurals English does, in categories its language has', () => {
  for (const l of LOCALES) {
    const has = new Set(new Intl.PluralRules(l).resolvedOptions().pluralCategories);
    for (const k of KEYS) {
      const want = templateShape(en[k]), got = templateShape(CATALOGS[l][k]);
      assert.deepEqual(got.names, want.names, `${l} ${k} placeholders`);
      assert.deepEqual(Object.keys(got.plurals).sort(), Object.keys(want.plurals).sort(), `${l} ${k} plurals`);
      for (const [arg, cats] of Object.entries(got.plurals)) {
        assert.ok(cats.includes('other'), `${l} ${k} {${arg}} has no other`);
        for (const c of cats) assert.ok(has.has(c as Intl.LDMLPluralRule), `${l} ${k} {${arg}}: ${c} is not a plural category of ${l}`);
      }
    }
  }
});

test('format interpolates names and leaves an unknown placeholder as written', () => {
  assert.equal(format('Focus group {direction}', { direction: 'left' }, 'en'), 'Focus group left');
  assert.equal(format('Hello {who}, {missing}', { who: 'Ada' }, 'en'), 'Hello Ada, {missing}');
  assert.equal(format('{a}{a}', { a: 1 }, 'en'), '11');
  assert.equal(format('no braces # here', {}, 'en'), 'no braces # here');
  assert.equal(format('unclosed {name', { name: 'x' }, 'en'), 'unclosed {name');
});

test('format picks the plural branch by the locale', () => {
  const tpl = '{count, plural, one {# chapter} other {# chapters}}';
  assert.equal(format(tpl, { count: 1 }, 'en'), '1 chapter');
  assert.equal(format(tpl, { count: 2 }, 'en'), '2 chapters');
  assert.equal(format(tpl, { count: 0 }, 'en'), '0 chapters');
  assert.equal(format('{count, plural, other {# 章}}', { count: 1 }, 'zh-CN'), '1 章');
  assert.equal(format('{count, plural, other {# 章}}', { count: 5 }, 'zh-CN'), '5 章');
  /* a category the locale does not use falls to other */
  assert.equal(format(tpl, { count: 1 }, 'zh-CN'), '1 chapters');
  assert.equal(format('{n, plural, one {# of {who}} other {# of {who}s}}', { n: 3, who: 'cat' }, 'en'), '3 of cats');
  assert.equal(format(tpl, {}, 'en'), tpl);
  assert.equal(format('{count, plural, one {x}}', { count: 1 }, 'en'), '{count, plural, one {x}}');
});

test('templateShape reads names and plural categories', () => {
  assert.deepEqual(templateShape('{a} {n, plural, one {# {b}} other {#}} {a}'), { names: ['a', 'b'], plurals: { n: ['one', 'other'] } });
});

test('parseLocale matches a catalog tag exactly, ignoring case', () => {
  assert.equal(parseLocale('ZH-cn'), 'zh-CN');
  assert.equal(parseLocale('en'), 'en');
  assert.equal(parseLocale('zh'), null);
  assert.equal(parseLocale('fr'), null);
  assert.equal(parseLocale(''), null);
  assert.equal(parseLocale(null), null);
  assert.equal(parseLocale(undefined), null);
});

test('matchLocale takes the first language with a catalog', () => {
  for (const tag of ['zh', 'zh-Hans', 'zh-Hans-CN', 'zh-TW', 'zh-CN', 'ZH-hk']) assert.equal(matchLocale([tag]), 'zh-CN', tag);
  assert.equal(matchLocale(['en-GB']), 'en');
  assert.equal(matchLocale(['fr', 'de']), 'en');
  assert.equal(matchLocale([]), 'en');
  assert.equal(matchLocale(['fr', 'zh-TW', 'en']), 'zh-CN');
  assert.equal(matchLocale(['en-US', 'zh-CN']), 'en');
});

test('every locale is named in its own language', () => {
  assert.deepEqual(Object.keys(LOCALE_NAMES).sort(), [...LOCALES].sort());
  assert.equal(LOCALE_NAMES['zh-CN'], '中文（简体）');
});

test('tIn falls back to English and then to the key; t follows the current locale', () => {
  assert.equal(tIn('en', 'settings.title'), 'Settings');
  assert.equal(tIn('en', 'nope.missing' as MessageKey), 'nope.missing');
  assert.equal(tIn('en', 'explorer.findTextbook.size', { chapters: 1, sections: 4 }), '1 chapter, 4 sections');
  assert.equal(currentLocale(), 'en');
  const seen: string[] = [];
  const stop = onLocaleChange((l) => seen.push(l));
  setCurrentLocale('zh-CN');
  assert.equal(t('settings.title'), tIn('zh-CN', 'settings.title'));
  setCurrentLocale('zh-CN');
  setCurrentLocale('en');
  stop();
  setCurrentLocale('zh-CN');
  setCurrentLocale('en');
  assert.deepEqual(seen, ['zh-CN', 'en']);
  assert.equal(t('settings.title'), 'Settings');
});

/* ---------- build-time words: the book's language ---------- */

test('the about page reads its words from the about area, in English for now', () => {
  const html = aboutHtml();
  assert.equal(aboutHtml('en'), html, 'no locale is English');
  for (const k of ['about.intro.platform', 'about.intro.books', 'about.try'] as const) assert.ok(html.includes(tIn('en', k).replace(/&/g, '&amp;')), k);
  assert.match(html, /It has a <span class="feature" data-feature="notes">markdown notetaker<\/span>, <span class="feature" data-feature="pomodoro">pomodoro<\/span>, /);
  assert.match(html, /data-feature="ai">Ask AI plugin<\/span>, and even an annotator/);
});

test('a page title and a credit read the same in English as they did before the catalog', () => {
  assert.equal(tIn('en', 'content.pageTitle', { page: '2.1 Displacement', book: 'College Physics 2e' }), '2.1 Displacement · College Physics 2e');
  assert.equal(tIn('en', 'content.chapter.eyebrow', { id: '2', title: 'Kinematics' }), 'Chapter 2 · Kinematics');
  assert.equal(tIn('en', 'content.credit.access', { url: 'x' }), ' Access for free at x.', 'a fragment joined on keeps its leading space');
});

/* ---------- the linter ---------- */

const lint = (files: Readonly<Record<string, string>>, ...flags: string[]): { code: number; rows: string[] } => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-lint-'));
  try {
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
    const r = spawnSync(process.execPath, [path.resolve('scripts/i18n-lint.mjs'), ...flags, dir], { encoding: 'utf8' });
    return { code: r.status ?? -1, rows: r.stdout.split('\n').filter(Boolean).map((l) => l.replace(/^.*?([\w.]+:\d+: )/, '$1')) };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
};

test('the linter reads .astro frontmatter, markup and markup inside an expression, and attributes over several lines', () => {
  const { code, rows } = lint({ 'p.astro': [
    '---', "const x = 'Hello there friend';", "const ok = tIn(locale, 'content.notes');", '---',
    '<div', '  title="Spanning', '  lines here"', '  class="a">',
    '  {cond && <p class="x">Shown when true</p>}',
    '  {items.map((i) => (', '    <li title={i}>Item label {i}</li>', '  ))}',
    "  {a < b ? 'Sentence here.' : ''}",
    '  {@html `<b>Never read</b>`}', '  <!-- A comment is never read -->',
    '</div>', "<style>.a::after { content: 'Never flagged'; }</style>",
  ].join('\n') });
  assert.equal(code, 1);
  assert.deepEqual(rows, ['p.astro:2: Hello there friend', 'p.astro:6: title="Spanning lines here"', 'p.astro:9: Shown when true', 'p.astro:11: Item label', 'p.astro:13: Sentence here.']);
});

test('the linter reads Svelte blocks and snippets as expressions and never {@html} or <style>', () => {
  const { rows } = lint({ 'c.svelte': [
    '<script lang="ts">', "  let { label = 'Default text' } = $props();", '</script>',
    '{#snippet row(name: string)}', '  <span>Row of {name}</span>', '{/snippet}',
    '{#if open}', '  <button', '    aria-label="Open the', '      thing">{i18n.t(\'x.y\')}</button>',
    '{:else if other}', '  Other text', '{/if}',
    "{@html '<p>Never read</p>'}", "{@render row('x')}", '<style>.x { content: "No"; }</style>',
  ].join('\n') });
  assert.deepEqual(rows, ['c.svelte:2: Default text', 'c.svelte:5: Row of', 'c.svelte:9: aria-label="Open the thing"', 'c.svelte:12: Other text']);
});

test('the linter reads the words of HTML a .ts module writes, and not a message that only names a tag', () => {
  const { rows } = lint({ 'f.ts': [
    'const a = `<section><h2>Section summary</h2>${body}</section>`;',
    "const b = '<nav aria-label=\"The pages around\"><span>x</span></nav>';",
    "const c = warn('is named by no <span data-ref> of the text');",
    "const d = `<h2>${tIn(locale, 'content.notes')}</h2>`;",
  ].join('\n') });
  assert.deepEqual(rows, ['f.ts:1: Section summary', 'f.ts:2: aria-label="The pages around"']);
});

test('the linter counts findings per directory with --summary', () => {
  const { code, rows } = lint({ 'a.ts': "const a = 'Hello there friend';\nconst b = 'Another one here';" }, '--summary');
  assert.equal(code, 1);
  assert.match(rows.at(-1)!, /^total\s+2$/);
});

test('an address may ask for a language once: ?lang= is read and taken off the query', () => {
  assert.deepEqual(localeOfQuery('?lang=zh-CN'), { locale: 'zh-CN', rest: '' });
  assert.deepEqual(localeOfQuery('?expr=x%5E2&lang=zh-cn'), { locale: 'zh-CN', rest: '?expr=x%5E2' });
  assert.deepEqual(localeOfQuery('?lang=fr&expr=1'), { locale: null, rest: '?lang=fr&expr=1' });
  assert.deepEqual(localeOfQuery(''), { locale: null, rest: '' });
});
