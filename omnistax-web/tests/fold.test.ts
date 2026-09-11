import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toggleId, addIds, removeIds, parseIds, renamedSimId, FOLDABLE, HIDEABLE } from '../src/lib/sections/fold';
import { DEFAULT_BINDINGS, DEFAULT_PAIRS } from '../src/lib/commands/defaults';
import { builtinCommands, BUILTIN, type BuiltinDeps } from '../src/lib/commands/builtin';
import { chord, chordsFor } from '../src/lib/commands/chord';

/* the set arithmetic on remembered ids: pure, order-keeping, never mutating */
test('toggleId adds an absent id and drops a present one', () => {
  const a = ['2.5-notation', '2.5-ex-jogger'] as const;
  assert.deepEqual(toggleId(a, '2.5-summary'), ['2.5-notation', '2.5-ex-jogger', '2.5-summary']);
  assert.deepEqual(toggleId(a, '2.5-notation'), ['2.5-ex-jogger']);
  assert.deepEqual(toggleId([], 'x'), ['x']);
  assert.deepEqual(a, ['2.5-notation', '2.5-ex-jogger'], 'input untouched');
});
test('addIds and removeIds keep order and never duplicate what is there', () => {
  assert.deepEqual(addIds(['a', 'b'], ['b', 'c']), ['a', 'b', 'c']);
  assert.deepEqual(addIds(['a'], []), ['a']);
  assert.deepEqual(removeIds(['a', 'b', 'c'], ['b', 'zzz']), ['a', 'c']);
  assert.deepEqual(removeIds([], ['a']), []);
  assert.deepEqual(removeIds(addIds(['a'], ['b']), ['a', 'b']), []);
});
test('a hidden figure remembered under the old prefix is read under the new one', () => {
  assert.equal(renamedSimId('2.5-demo-avg'), '2.5-sim-avg'); assert.equal(renamedSimId('2.5-sim-avg'), '2.5-sim-avg'); assert.equal(renamedSimId('2.5-fig-paths'), '2.5-fig-paths');
});
test('parseIds accepts only a list of strings', () => {
  assert.deepEqual(parseIds(['a', 'b']), ['a', 'b']);
  assert.deepEqual(parseIds([]), []);
  assert.equal(parseIds(['a', 1]), null); assert.equal(parseIds('a'), null); assert.equal(parseIds(null), null); assert.equal(parseIds({ 0: 'a' }), null);
});
test('the foldable and hideable selectors name only spans and figures that carry ids', () => {
  assert.equal(FOLDABLE, 'section[id], .example[id]');
  assert.equal(HIDEABLE, 'figure.sim[id], figure.photo[id]');
});

/* the default chords: each parses, none is claimed twice, each names a builtin command */
const deps = (): BuiltinDeps => ({
  settings: { colorCoding: true, theme: 'system', animations: true, exerciseMode: 'all', voice: false, underlines: true, setColorCoding: () => {}, setTheme: () => {}, cycleTheme: () => {}, setAnimations: () => {}, setExerciseMode: () => {}, setVoice: () => {}, setUnderlines: () => {} },
  layout: {
    reset: () => {}, splitRight: () => {}, splitDown: () => {}, moveRight: () => {}, moveDown: () => {},
    closeTab: () => {}, closeGroup: () => {}, closeOtherGroups: () => {}, evenGroups: () => {}, focusNextGroup: () => {}, focusPreviousGroup: () => {}, focusGroup: () => {},
    nextTab: () => {}, previousTab: () => {}, reopenClosedTab: () => {}, canReopenTab: true, groupCount: 2,
  },
  fold: { foldAll: () => {}, unfoldAll: () => {}, hideFigures: () => {}, showFigures: () => {} },
  ui: { openPalette: () => {}, openSettings: () => {}, openBrowser: () => {}, openFindTextbook: () => {}, palette: { open: false, group: null }, browser: { open: false } },
  reader: { supported: false, speaking: false, readFocused: () => {}, stop: () => {} },
  scope: { activeView: () => 'view:concepts', level: () => 'section', pinned: () => false, widen: () => {}, narrow: () => {}, atLevel: () => {}, previous: () => {}, next: () => {}, togglePin: () => {}, pickTarget: () => {} },
  docs: { openView: () => {}, openExercises: () => {}, canOpenExercises: () => true },
  notes: { newNote: () => {}, toggleMode: () => {}, canToggle: () => true },
  history: { undo: () => {}, redo: () => {}, canUndo: true, canRedo: true, undoLabel: 'highlight in yellow', redoLabel: '' },
  colours: { undo: () => {}, redo: () => {}, canUndo: true, canRedo: true, undoLabel: 'velocity in section 16.3', redoLabel: '' },
});
test('every default chord parses, is unique, and names a builtin command', () => {
  const chords = DEFAULT_PAIRS.map(([c]) => c);
  chords.forEach((c) => assert.ok(chord(c), c));   /* a binding may be one press or a sequence of two */
  assert.equal(new Set(chords).size, chords.length, 'a chord bound twice');
  assert.equal(Object.keys(DEFAULT_BINDINGS).length, chords.length, 'a chord lost in parsing');
  const ids = new Set(builtinCommands(deps()).map((c) => c.id));
  Object.values(DEFAULT_BINDINGS).forEach((id) => assert.ok(ids.has(id), `${id} is not a builtin`));
});
test('folding and figure chords are bound as documented', () => {
  assert.deepEqual(chordsFor(DEFAULT_BINDINGS, BUILTIN.foldAll), ['Ctrl+Shift+[']);
  assert.deepEqual(chordsFor(DEFAULT_BINDINGS, BUILTIN.unfoldAll), ['Ctrl+Shift+]']);
  assert.deepEqual(chordsFor(DEFAULT_BINDINGS, BUILTIN.hideFigures), ['Ctrl+Shift+H']);
  assert.deepEqual(chordsFor(DEFAULT_BINDINGS, BUILTIN.showFigures), ['Ctrl+Shift+J']);
  const reading = builtinCommands(deps()).filter((c) => [BUILTIN.foldAll, BUILTIN.unfoldAll, BUILTIN.hideFigures, BUILTIN.showFigures].includes(c.id));
  assert.equal(reading.length, 4); reading.forEach((c) => assert.equal(c.group, 'Reading'));
});
