import test from 'node:test';
import assert from 'node:assert/strict';
import { DICTATION_LANGS, availability, heardOf, isDictationLang, joinDictated, languageName, languagesByName, listeningLang, recognitionOf } from '../src/lib/chat/dictation';
import { categoryOf, validReaderRecord } from '../src/lib/backup/schema';
import { describeRecord } from '../src/lib/sync/describe';

test('the mic is off where recognition is missing, in the desktop app, and offline, in that order of reasons', () => {
  assert.equal(availability({ api: true, desktop: false, online: true }), 'ready');
  assert.equal(availability({ api: false, desktop: true, online: false }), 'unsupported', 'Firefox, wherever it runs');
  assert.equal(availability({ api: true, desktop: true, online: true }), 'desktop');
  assert.equal(availability({ api: true, desktop: false, online: false }), 'offline');
  const Ctor = function () { /* a recognition */ };
  assert.equal(recognitionOf({ webkitSpeechRecognition: Ctor }), Ctor);
  assert.equal(recognitionOf({ SpeechRecognition: Ctor, webkitSpeechRecognition: () => 0 }), Ctor, 'the standard name first');
  assert.equal(recognitionOf({}), null);
  assert.equal(recognitionOf(undefined), null);
});

test('it listens in the reader’s choice, else OmniStax’s language, English in the browser’s own variety', () => {
  assert.equal(listeningLang('fr-FR', 'en', ['en-GB']), 'fr-FR');
  assert.equal(listeningLang('', 'zh-CN', ['en-US']), 'zh-CN');
  assert.equal(listeningLang('', 'en', ['fr-FR', 'en-GB']), 'en-GB');
  assert.equal(listeningLang('', 'en', ['de-DE']), 'en-US');
  assert.equal(listeningLang('', 'en', ['en-XX']), 'en-US', 'a variety not offered');
  assert.equal(listeningLang('klingon', 'en', []), 'en-US', 'a choice not offered is no choice');
});

test('every language offered is a well-formed tag, offered once, named in the reader’s language', () => {
  assert.equal(new Set(DICTATION_LANGS).size, DICTATION_LANGS.length);
  for (const tag of DICTATION_LANGS) assert.deepEqual(Intl.getCanonicalLocales(tag), [tag], tag);
  assert.ok(DICTATION_LANGS.length >= 80);
  for (const popular of ['en-US', 'zh-CN', 'zh-TW', 'es-ES', 'hi-IN', 'ar-SA', 'fr-FR', 'pt-BR', 'ru-RU', 'ja-JP', 'de-DE', 'ko-KR']) assert.ok(isDictationLang(popular), popular);
  assert.match(languageName('en-GB', 'en'), /English/);
  assert.match(languageName('en-GB', 'zh-CN'), /英/);
  const en = languagesByName('en');
  assert.equal(en.length, DICTATION_LANGS.length);
  assert.deepEqual(en.map((l) => l.name), [...en.map((l) => l.name)].sort((a, b) => a.localeCompare(b, 'en')));
});

test('what was said joins what was typed: spaced where words are, not in a language written without spaces', () => {
  assert.equal(joinDictated('', 'hello there', '', 'en-US'), 'hello there');
  assert.equal(joinDictated('What is', 'a derivative', '', 'en-US'), 'What is a derivative');
  assert.equal(joinDictated('What is ', 'a derivative', '?', 'en-US'), 'What is a derivative ?');
  assert.equal(joinDictated('Explain', 'the chain rule', 'please', 'en-GB'), 'Explain the chain rule please');
  assert.equal(joinDictated('什么是', '导数', '？', 'zh-CN'), '什么是导数？');
  assert.equal(joinDictated('keep', '   ', 'this', 'en-US'), 'keepthis', 'nothing heard leaves the text as it was');
});

test('everything heard so far reads as one: the settled words, then the guess', () => {
  const results = Object.assign([Object.assign([{ transcript: 'the integral' }], { isFinal: true }), Object.assign([{ transcript: ' of x squared' }], { isFinal: false })]);
  assert.equal(heardOf({ results }), 'the integral of x squared');
  assert.equal(heardOf({ results: [] }), '');
});

test('the language chosen travels with the other settings, and its sync file says what it is', () => {
  assert.equal(categoryOf('omnistax-dictation-lang'), 'appearance');
  assert.equal(validReaderRecord({ key: 'omnistax-dictation-lang', value: 'ja-JP', category: 'appearance' }), true);
  assert.equal(validReaderRecord({ key: 'omnistax-dictation-lang', value: 'nonsense', category: 'appearance' }), false);
  assert.equal(describeRecord('omnistax-dictation-lang', 'en'), 'Speech input language');
});
