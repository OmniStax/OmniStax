import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, startOf, version, type Version } from '../src/lib/releases/version';
import { parseNote, readNotes } from '../src/lib/content/releases';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const v = (s: string): Version => version(s)!;

test('a version is a date and a count, without padding', () => {
  assert.ok(version('2026.11.7.1')); assert.ok(version('2026.1.31.0'));
  for (const bad of ['2026.11.07.1', '2026.13.1.0', '2026.11.7', '26.11.7.1', '2026.11.32.0']) assert.equal(version(bad), null, bad);
});

test('versions sort by date, then by the count of the day', () => {
  assert.ok(compareVersions(v('2026.9.30.0'), v('2026.10.1.0')) < 0);
  assert.ok(compareVersions(v('2026.11.7.2'), v('2026.11.7.10')) < 0);
  assert.equal(compareVersions(v('2026.11.7.1'), v('2026.11.7.1')), 0);
});

test('the start: a new reader, unseen notes, nothing new', () => {
  assert.equal(startOf(false, null, v('2026.11.7.1')), 'fresh');
  assert.equal(startOf(false, null, null), 'fresh');
  assert.equal(startOf(true, null, v('2026.11.7.1')), 'notes', 'a reader from before notes gets them once');
  assert.equal(startOf(true, v('2026.11.7.0'), v('2026.11.7.1')), 'notes');
  assert.equal(startOf(true, v('2026.11.7.1'), v('2026.11.7.1')), 'none');
  assert.equal(startOf(true, null, null), 'none');
});

test('a note is checked: its version, its title, nothing else in its front matter', () => {
  const good = parseNote('a.md', '---\nversion: 2026.11.7.1\ntitle: Review page\ndesktop: true\n---\nBody ![x](images/x.png)\n');
  assert.equal(good.version, '2026.11.7.1'); assert.equal(good.desktop, true);
  assert.match(good.html, /src="\/releases\/images\/x\.png"/);
  assert.throws(() => parseNote('b.md', '---\nversion: 2026.11.07.1\ntitle: x\n---\n'), /b\.md/);
  assert.throws(() => parseNote('c.md', '---\nversion: 2026.11.7.1\n---\n'), /c\.md/);
  assert.throws(() => parseNote('d.md', '---\nversion: 2026.11.7.1\ntitle: x\nextra: 1\n---\n'), /d\.md/);
  assert.throws(() => parseNote('e.md', 'no front matter'), /e\.md/);
});

test('notes read newest first, a Chinese sibling beside its note, a version used twice refused', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-'));
  fs.writeFileSync(path.join(dir, 'one.md'), '---\nversion: 2026.11.7.0\ntitle: One\n---\nfirst');
  fs.writeFileSync(path.join(dir, 'two.md'), '---\nversion: 2026.11.7.1\ntitle: Two\n---\nsecond');
  fs.writeFileSync(path.join(dir, 'two.zh-CN.md'), '---\nversion: 2026.11.7.1\ntitle: 二\n---\n第二');
  const notes = readNotes(dir);
  assert.deepEqual(notes.map((n) => n.version), ['2026.11.7.1', '2026.11.7.0']);
  assert.equal(notes[0].zh?.title, '二'); assert.equal(notes[1].zh, undefined);
  fs.writeFileSync(path.join(dir, 'three.md'), '---\nversion: 2026.11.7.1\ntitle: Again\n---\n');
  assert.throws(() => readNotes(dir), /2026\.11\.7\.1/);
  assert.deepEqual(readNotes(path.join(dir, 'missing')), []);
});
