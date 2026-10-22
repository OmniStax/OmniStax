import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGS, LOCALES, LOCALE_NAMES, currentLocale, en, format, matchLocale, onLocaleChange, parseLocale, setCurrentLocale, t, tIn, templateShape, type MessageKey } from '../src/lib/i18n/index';
import { AREAS } from '../src/lib/i18n/en/index';
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
