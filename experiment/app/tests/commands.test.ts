import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord, formatChord, chord, chordOf, chordKeys, resolveChord, rebind, chordsFor, withoutCommand, parseBindings, type Bindings, type KeyLike } from '../src/lib/commands/chord';
import { fuzzy, rank } from '../src/lib/commands/fuzzy';
import { builtinCommands, BUILTIN, openViewId, showViewId, type BuiltinDeps } from '../src/lib/commands/builtin';
import { commandId, available } from '../src/lib/commands/command';
import { DEFAULT_PAIRS } from '../src/lib/commands/defaults';
import { SIDEBAR_KINDS, VIEW_KINDS, isSidebarKind, type ViewKind } from '../src/lib/types/ids';
import type { Level } from '../src/lib/sections/scope';

/* chords */
test('chord parse/format round trip, any modifier order and spelling', () => {
  for (const s of ['Ctrl+K', 'Ctrl+Shift+P', 'Alt+F', 'Ctrl+,', 'Ctrl+Alt+Shift+ArrowUp', 'F1', 'Space', 'Ctrl++']) {
    const p = parseChord(s); assert.ok(p, s); assert.equal(formatChord(p), s); assert.deepEqual(parseChord(formatChord(p)), p);
  }
  assert.equal(chord('shift+ctrl+p'), 'Ctrl+Shift+P');
  assert.equal(chord('cmd+k'), 'Ctrl+K');
  assert.equal(chord('meta+option+z'), 'Ctrl+Alt+Z');
  assert.equal(chord('ctrl+space'), 'Ctrl+Space');
  assert.equal(chord('+'), '+');
  assert.deepEqual(parseChord('Ctrl+,'), { ctrl: true, alt: false, shift: false, key: ',' });
  assert.deepEqual(chordKeys(chord('Ctrl+Shift+P')!), ['Ctrl', 'Shift', 'P']);
});
test('chord parse rejects junk', () => {
  assert.equal(parseChord(''), null); assert.equal(parseChord('Ctrl+'), null); assert.equal(parseChord('Bogus+K'), null); assert.equal(parseChord('Ctrl'), null);
});
const ev = (o: Partial<KeyLike> & { key: string }): KeyLike => ({ code: '', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...o });
test('chordOf reads the physical key and treats Meta as Ctrl', () => {
  assert.equal(chordOf(ev({ key: 'k', code: 'KeyK', ctrlKey: true })), 'Ctrl+K');
  assert.equal(chordOf(ev({ key: 'k', code: 'KeyK', metaKey: true })), 'Ctrl+K');
  assert.equal(chordOf(ev({ key: 'P', code: 'KeyP', ctrlKey: true, shiftKey: true })), 'Ctrl+Shift+P');
  assert.equal(chordOf(ev({ key: '<', code: 'Comma', ctrlKey: true, shiftKey: true })), 'Ctrl+Shift+,');
  assert.equal(chordOf(ev({ key: ',', code: 'Comma', ctrlKey: true })), 'Ctrl+,');
  assert.equal(chordOf(ev({ key: 'Control', code: 'ControlLeft', ctrlKey: true })), null);
  assert.equal(chordOf(ev({ key: 'ArrowDown', code: 'ArrowDown' })), 'ArrowDown');
});

/* dispatch */
const palette = commandId('palette'), settings = commandId('settings'), plain = commandId('plain');
const bindings = { 'Ctrl+K': palette, 'Ctrl+Shift+P': palette, 'Ctrl+,': settings, 'F': plain } as Bindings;
test('resolveChord matches bindings and skips plain keys typed into fields', () => {
  assert.equal(resolveChord(bindings, ev({ key: 'k', code: 'KeyK', ctrlKey: true }))?.id, palette);
  assert.equal(resolveChord(bindings, ev({ key: 'P', code: 'KeyP', metaKey: true, shiftKey: true }))?.id, palette);
  assert.equal(resolveChord(bindings, ev({ key: ',', code: 'Comma', ctrlKey: true }))?.id, settings);
  assert.equal(resolveChord(bindings, ev({ key: 'x', code: 'KeyX', ctrlKey: true })), null);
  const input = { tagName: 'INPUT' }, div = { tagName: 'DIV' }, editable = { tagName: 'DIV', isContentEditable: true };
  assert.equal(resolveChord(bindings, ev({ key: 'f', code: 'KeyF', target: div }))?.id, plain);
  assert.equal(resolveChord(bindings, ev({ key: 'f', code: 'KeyF', target: input })), null);
  assert.equal(resolveChord(bindings, ev({ key: 'f', code: 'KeyF', target: editable })), null);
  assert.equal(resolveChord(bindings, ev({ key: 'k', code: 'KeyK', ctrlKey: true, target: input }))?.id, palette);
});
test('rebind gives a command one chord and takes it from the previous owner', () => {
  const b = rebind(bindings, settings, 'Ctrl+K' as never);
  assert.deepEqual(chordsFor(b, settings), ['Ctrl+K']); assert.deepEqual(chordsFor(b, palette), ['Ctrl+Shift+P']);
  assert.deepEqual(chordsFor(withoutCommand(b, palette), palette), []);
  assert.deepEqual(parseBindings({ 'ctrl+k': 'palette', junk: 3, 'Bogus+Q': 'x' }), { 'Ctrl+K': 'palette' });
  assert.equal(parseBindings([1]), null);
});

/* fuzzy */
test('fuzzy scoring: prefix and runs beat scattered matches, non-subsequences fail', () => {
  const s = (q: string, t: string) => fuzzy(q, t)?.score ?? -Infinity;
  assert.ok(s('open', 'Open settings') > s('open', 'Toggle exercise pane'));
  assert.ok(s('anim', 'Toggle animations') > s('anim', 'A new item'));
  assert.ok(s('theme', 'Appearance Theme: dark') > s('theme', 'Reading Toggle voice theme'));
  assert.equal(fuzzy('xyz', 'Open settings'), null);
  assert.deepEqual(fuzzy('', 'anything'), { score: 0, indices: [] });
  assert.deepEqual(fuzzy('OS', 'open settings')?.indices, [0, 5]);
  assert.equal(fuzzy('tc', 'Toggle colour coding')?.indices[1], 7);   /* the word start, not the first c after t */
});
test('rank orders best-first and keeps ties in the given order', () => {
  const items = ['Reading Toggle animations', 'App Open settings', 'Sections Open 2.1 Displacement: Text', 'App Open command palette'];
  const r = rank('open', items, (x) => x).map((x) => x.item);
  /* the two "App Open …" labels tie (same prefix, same first hit) and keep their order; the later hit in "Sections Open …" ranks below them */
  assert.deepEqual(r, ['App Open settings', 'App Open command palette', 'Sections Open 2.1 Displacement: Text']);
  assert.deepEqual(rank('', items, (x) => x).map((x) => x.item), items);
});

/* builtins */
/* The view the scope commands act on: which one is active, where it stands, whether it is pinned. */
type ViewState = { readonly view?: ViewKind | null; readonly level?: Level; readonly pinned?: boolean };
const deps = (browserOpen = false, groups = 2, view: ViewState = {}, exercisesBuilt = true, noteOpen = true): BuiltinDeps & { log: string[] } => {
  const log: string[] = [];
  const kind = view.view === undefined ? 'concepts' : view.view;
  return {
    log,
    settings: { colorCoding: true, theme: 'system', animations: true, exerciseMode: 'all', voice: false, setColorCoding: (v) => log.push(`cc ${v}`), setTheme: (t) => log.push(`theme ${t}`), cycleTheme: () => log.push('cycle'), setAnimations: (v) => log.push(`anim ${v}`), setExerciseMode: (m) => log.push(`mode ${m}`), setVoice: (v) => log.push(`voice ${v}`) },
    layout: {
      reset: () => log.push('reset'), splitRight: () => log.push('split right'), splitDown: () => log.push('split down'),
      moveRight: () => log.push('move right'), moveDown: () => log.push('move down'),
      closeGroup: () => log.push('close group'), closeOtherGroups: () => log.push('close others'), evenGroups: () => log.push('even groups'),
      focusNextGroup: () => log.push('focus next'), focusPreviousGroup: () => log.push('focus previous'), focusGroup: (dir) => log.push(`focus ${dir}`),
      nextTab: () => log.push('next tab'), previousTab: () => log.push('previous tab'), groupCount: groups,
    },
    fold: { foldAll: () => log.push('fold'), unfoldAll: () => log.push('unfold'), hideFigures: () => log.push('hide'), showFigures: () => log.push('show') },
    ui: { openPalette: () => log.push('palette'), openSettings: () => log.push('settings'), openBrowser: (o) => log.push(`browser ${o?.group}`), openFindTextbook: () => log.push('find textbook'), palette: { open: false, group: 1 }, browser: { open: browserOpen } },
    reader: { supported: true, speaking: false, readFocused: () => log.push('read'), stop: () => log.push('stop') },
    scope: {
      activeView: () => kind, level: () => (kind ? view.level ?? 'section' : null), pinned: () => view.pinned === true,
      widen: () => log.push('widen'), narrow: () => log.push('narrow'), atLevel: (l) => log.push(`at ${l}`),
      previous: () => log.push('previous'), next: () => log.push('next'), togglePin: () => log.push('toggle pin'), pickTarget: () => log.push('pick'),
    },
    docs: { openView: (k, w) => log.push(`view ${k} ${w}`), openExercises: () => log.push('exercises'), canOpenExercises: () => exercisesBuilt },
    notes: { newNote: () => log.push('new note'), toggleMode: () => log.push('toggle mode'), canToggle: () => noteOpen },
  };
};
test('builtin command ids are unique and every fixed id is present', () => {
  const cmds = builtinCommands(deps());
  const ids = cmds.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  Object.values(BUILTIN).forEach((id) => assert.ok(ids.includes(id), id));
  assert.ok(ids.includes(BUILTIN.open), 'the browser is opened by one command');
  cmds.forEach((c) => { assert.ok(c.label && c.group, c.id); assert.equal(typeof c.run, 'function'); });
});
test('builtin commands act on their stores', () => {
  const d = deps(); const cmds = builtinCommands(d); const by = (id: string) => cmds.find((c) => c.id === id)!;
  by(BUILTIN.animations).run(); by(BUILTIN.themeDark).run(); by(BUILTIN.themeCycle).run(); by(BUILTIN.exerciseOne).run(); by(BUILTIN.open).run(); by(BUILTIN.resetLayout).run();
  by(BUILTIN.splitDown).run(); by(BUILTIN.moveRight).run(); by(BUILTIN.focusGroupLeft).run(); by(BUILTIN.nextTab).run(); by(BUILTIN.closeOtherGroups).run();
  assert.deepEqual(d.log, ['anim false', 'theme dark', 'cycle', 'mode one', 'browser 1', 'reset', 'split down', 'move right', 'focus left', 'next tab', 'close others']);
  assert.equal(by(BUILTIN.themeSystem).detail?.(), 'current'); assert.equal(by(BUILTIN.themeDark).detail?.(), '');
  assert.equal(available(by(BUILTIN.readAloud)), false, 'voice off hides read aloud');
  assert.equal(available(by(BUILTIN.stopReading)), false);
  assert.equal(available(by(BUILTIN.palette)), true);
  assert.equal(available(by(BUILTIN.open)), true);
});
test('the group commands appear only once there is more than one group', () => {
  const one = builtinCommands(deps(false, 1)); const two = builtinCommands(deps(false, 2));
  const by = (cmds: readonly ReturnType<typeof builtinCommands>[number][], id: string) => cmds.find((c) => c.id === id)!;
  for (const id of [BUILTIN.closeGroup, BUILTIN.closeOtherGroups, BUILTIN.focusNextGroup, BUILTIN.focusGroupUp]) {
    assert.equal(available(by(one, id)), false, id); assert.equal(available(by(two, id)), true, id);
  }
  assert.equal(available(by(one, BUILTIN.splitRight)), true, 'a single group can still be split');
  assert.equal(by(two, BUILTIN.focusGroupDown).label, 'Focus group below');
});
test('every default chord names a builtin command', () => {
  const ids = new Set(builtinCommands(deps()).map((c) => String(c.id)));
  DEFAULT_PAIRS.forEach(([c, id]) => assert.ok(ids.has(id), `${c} → ${id}`));
});
test('a bare chord works outside a field and is left alone inside one', () => {
  const bare = { 'ArrowLeft': commandId('scope-widen') } as Bindings;
  assert.equal(resolveChord(bare, ev({ key: 'ArrowLeft', code: 'ArrowLeft', target: { tagName: 'DIV' } }))?.id, 'scope-widen');
  assert.equal(resolveChord(bare, ev({ key: 'ArrowLeft', code: 'ArrowLeft', target: { tagName: 'INPUT' } })), null);
  assert.equal(chord('ArrowLeft'), 'ArrowLeft');
});
test('the scope commands act on the view the reader last touched, and none of them without one', () => {
  const d = deps(); const cmds = builtinCommands(d); const by = (id: string) => cmds.find((c) => c.id === id)!;
  by(BUILTIN.scopeWiden).run(); by(BUILTIN.scopeNarrow).run(); by(BUILTIN.scopeBook).run(); by(BUILTIN.scopePick).run();
  assert.deepEqual(d.log, ['widen', 'narrow', 'at book', 'pick']);
  assert.equal(by(BUILTIN.scopeSection).detail?.(), 'current', 'a view following the page stands at its section');
  assert.equal(by(BUILTIN.scopeChapter).detail?.(), '');
  const none = builtinCommands(deps(false, 2, { view: null }));
  for (const id of [BUILTIN.scopeWiden, BUILTIN.scopeNarrow, BUILTIN.scopeBook, BUILTIN.scopeSection, BUILTIN.scopePin, BUILTIN.scopeUnpin, BUILTIN.scopePick, BUILTIN.scopePrevious, BUILTIN.scopeNext]) {
    assert.equal(available(none.find((c) => c.id === id)!), false, id);
  }
});
test('the previous and next chapter or section are a view away, but not at the book', () => {
  const d = deps(); const cmds = builtinCommands(d); const by = (id: string) => cmds.find((c) => c.id === id)!;
  by(BUILTIN.scopePrevious).run(); by(BUILTIN.scopeNext).run();
  assert.deepEqual(d.log, ['previous', 'next']);
  assert.equal(by(BUILTIN.scopePrevious).label, 'View scope: previous chapter or section');
  assert.equal(by(BUILTIN.scopeNext).label, 'View scope: next chapter or section');
  const at = (level: Level, id: string) => available(builtinCommands(deps(false, 2, { level })).find((c) => c.id === id)!);
  assert.equal(at('book', BUILTIN.scopeNext), false); assert.equal(at('chapter', BUILTIN.scopeNext), true); assert.equal(at('section', BUILTIN.scopePrevious), true);
});
test('widening stops at the book and narrowing at the section', () => {
  const at = (level: Level, id: string) => available(builtinCommands(deps(false, 2, { level })).find((c) => c.id === id)!);
  assert.equal(at('book', BUILTIN.scopeWiden), false); assert.equal(at('book', BUILTIN.scopeNarrow), true);
  assert.equal(at('section', BUILTIN.scopeNarrow), false); assert.equal(at('section', BUILTIN.scopeWiden), true);
  assert.equal(at('chapter', BUILTIN.scopeWiden), true); assert.equal(at('chapter', BUILTIN.scopeNarrow), true);
});
test('a view is pinned or unpinned by one command or the other, never both', () => {
  const shown = (view: ViewState) => [BUILTIN.scopePin, BUILTIN.scopeUnpin].map((id) => available(builtinCommands(deps(false, 2, view)).find((c) => c.id === id)!));
  assert.deepEqual(shown({ level: 'section' }), [true, false]);
  assert.deepEqual(shown({ level: 'section', pinned: true }), [false, true]);
  assert.deepEqual(shown({ level: 'book' }), [false, false], 'at the book there is nothing to hold');
  const d = deps(false, 2, { level: 'section', pinned: true }); const cmds = builtinCommands(d);
  cmds.find((c) => c.id === BUILTIN.scopeUnpin)!.run();
  assert.deepEqual(d.log, ['toggle pin']);
});
test('the sidebar views open in a group or in the sidebar, the rest only in a split', () => {
  const d = deps(); const cmds = builtinCommands(d); const by = (id: string) => cmds.find((c) => c.id === id)!;
  VIEW_KINDS.forEach((k) => {
    assert.ok(cmds.some((c) => c.id === openViewId(k)), k);
    assert.equal(cmds.some((c) => c.id === showViewId(k)), isSidebarKind(k), k);
  });
  assert.deepEqual([...SIDEBAR_KINDS], ['explorer', 'annotations']);
  assert.equal(by(openViewId('formulas')).label, 'Open Formulas in a split');
  assert.equal(by(openViewId('explorer')).label, 'Open Explorer in a group');
  assert.equal(by(showViewId('annotations')).label, 'Show Annotations in the sidebar');
  by(openViewId('annotations')).run(); by(showViewId('annotations')).run(); by(openViewId('concepts')).run(); by(BUILTIN.openExercises).run();
  assert.deepEqual(d.log, ['view annotations group', 'view annotations side', 'view concepts split', 'exercises']);
  assert.equal(available(by(BUILTIN.openExercises)), true);
  assert.equal(available(builtinCommands(deps(false, 2, {}, false)).find((c) => c.id === BUILTIN.openExercises)!), false, 'a section that is not built has no exercises to open');
});
test('the note commands and the textbook finder act on their stores', () => {
  const d = deps(); const cmds = builtinCommands(d); const by = (id: string) => cmds.find((c) => c.id === id)!;
  by(BUILTIN.noteNew).run(); by(BUILTIN.noteToggleMode).run(); by(BUILTIN.findTextbook).run();
  assert.deepEqual(d.log, ['new note', 'toggle mode', 'find textbook']);
  assert.equal(available(by(BUILTIN.noteToggleMode)), true);
  assert.equal(available(builtinCommands(deps(false, 2, {}, true, false)).find((c) => c.id === BUILTIN.noteToggleMode)!), false, 'nothing to toggle without a note in hand');
  assert.equal(available(by(BUILTIN.noteNew)), true);
});
test('Open… is hidden while the browser is up, so its chord cannot reset the tree', () => {
  const open = (d: BuiltinDeps) => builtinCommands(d).find((c) => c.id === BUILTIN.open)!;
  assert.equal(available(open(deps(true))), false);
  assert.equal(available(open(deps(false))), true);
});
