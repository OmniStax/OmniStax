import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chord, chordsFor, rebind, type Chord } from '../src/lib/commands/chord';
import { commandId } from '../src/lib/commands/command';
import { applyChanges, changesAfter, changesFrom, defaultBindings, parseChanges } from '../src/lib/commands/defaults';
import type { Host } from '../src/lib/commands/host';

const tab: Host = { browser: 'chromium', surface: 'tab' };
const desktop: Host = { browser: 'chromium', surface: 'desktop' };
const c = (s: string): Chord => chord(s)!;
const closeTab = commandId('close-tab'), noteNew = commandId('note-new'), palette = commandId('palette');

test('no changes is each host its own defaults', () => {
  assert.deepEqual(applyChanges(tab, {}), defaultBindings(tab));
  assert.deepEqual(applyChanges(desktop, {}), defaultBindings(desktop));
});

test('a change made on the desktop applies as made where the host can take it', () => {
  const before = applyChanges(desktop, {});
  const changes = changesAfter(desktop, {}, before, rebind(before, palette, c('Ctrl+J')));
  assert.deepEqual(changes, { [palette]: [c('Ctrl+J')] });
  assert.deepEqual(chordsFor(applyChanges(tab, changes), palette), [c('Ctrl+J')]);
});

test('a chord the tab keeps for itself becomes its Alt twin there', () => {
  const changes = { [noteNew]: [c('Ctrl+N')] };
  assert.deepEqual(chordsFor(applyChanges(desktop, changes), noteNew), [c('Ctrl+N')]);
  assert.deepEqual(chordsFor(applyChanges(tab, changes), noteNew), [c('Alt+N')]);
});

test('an Alt twin another command holds leaves the command its default here', () => {
  /* Alt+W is close-tab's default, so note-new asking for Ctrl+W in a tab cannot take it. */
  const tabbed = applyChanges(tab, { [noteNew]: [c('Ctrl+W')] });
  assert.deepEqual(chordsFor(tabbed, noteNew), chordsFor(defaultBindings(tab), noteNew));
  assert.deepEqual(chordsFor(tabbed, closeTab), [c('Alt+W')]);
});

test('an edit keeps changes made elsewhere and records the command it displaced', () => {
  const fromDesktop = { [closeTab]: [c('Ctrl+W')] };
  const before = applyChanges(tab, fromDesktop);
  const holder = before[c('Ctrl+Shift+P')];
  const after = changesAfter(tab, fromDesktop, before, rebind(before, noteNew, c('Ctrl+Shift+P')));
  assert.deepEqual(after[closeTab], [c('Ctrl+W')], 'the desktop change survives an edit in the tab');
  assert.deepEqual(after[noteNew], [c('Ctrl+Shift+P')]);
  assert.deepEqual(after[holder], [], 'the command that lost its chord is recorded as cleared');
});

test('going back to the default drops the change', () => {
  const changed = { [palette]: [c('Ctrl+J')] };
  const before = applyChanges(tab, changed);
  const back = rebind(before, palette, c('Ctrl+Shift+P'));
  assert.deepEqual(changesAfter(tab, changed, before, back), {});
});

test('an old whole map reads as its changes from this host', () => {
  const old = rebind(defaultBindings(tab), palette, c('Ctrl+J'));
  assert.deepEqual(changesFrom(tab, old), { [palette]: [c('Ctrl+J')] });
  assert.deepEqual(changesFrom(tab, defaultBindings(tab)), {});
});

test('stored changes keep only valid chords', () => {
  assert.deepEqual(parseChanges({ palette: ['ctrl+j', '', 3] }), { palette: [c('Ctrl+J')] });
  assert.equal(parseChanges(['x']), null);
});
