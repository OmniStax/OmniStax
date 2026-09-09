import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord, formatChord, chord, chordOf, chordKeys, resolveChord, rebind, chordsFor, withoutCommand, parseBindings, type Bindings, type KeyLike } from '../src/lib/commands/chord';
import { fuzzy, rank } from '../src/lib/commands/fuzzy';
import { builtinCommands, BUILTIN, type BuiltinDeps } from '../src/lib/commands/builtin';
import { commandId, available } from '../src/lib/commands/command';

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
const deps = (browserOpen = false, groups = 2): BuiltinDeps & { log: string[] } => {
  const log: string[] = [];
  return {
    log,
    settings: { colorCoding: true, theme: 'system', animations: true, exerciseMode: 'all', voice: false, setColorCoding: (v) => log.push(`cc ${v}`), setTheme: (t) => log.push(`theme ${t}`), cycleTheme: () => log.push('cycle'), setAnimations: (v) => log.push(`anim ${v}`), setExerciseMode: (m) => log.push(`mode ${m}`), setVoice: (v) => log.push(`voice ${v}`) },
    layout: {
      reset: () => log.push('reset'), splitRight: () => log.push('split right'), splitDown: () => log.push('split down'),
      moveRight: () => log.push('move right'), moveDown: () => log.push('move down'),
      closeGroup: () => log.push('close group'), closeOtherGroups: () => log.push('close others'),
      focusNextGroup: () => log.push('focus next'), focusPreviousGroup: () => log.push('focus previous'), focusGroup: (dir) => log.push(`focus ${dir}`),
      nextTab: () => log.push('next tab'), previousTab: () => log.push('previous tab'), groupCount: groups,
    },
    fold: { foldAll: () => log.push('fold'), unfoldAll: () => log.push('unfold'), hideFigures: () => log.push('hide'), showFigures: () => log.push('show') },
    ui: { openPalette: () => log.push('palette'), openSettings: () => log.push('settings'), openBrowser: (o) => log.push(`browser ${o?.group}`), palette: { open: false, group: 1 }, browser: { open: browserOpen } },
    reader: { supported: true, speaking: false, readFocused: () => log.push('read'), stop: () => log.push('stop') },
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
test('Open… is hidden while the browser is up, so its chord cannot reset the tree', () => {
  const open = (d: BuiltinDeps) => builtinCommands(d).find((c) => c.id === BUILTIN.open)!;
  assert.equal(available(open(deps(true))), false);
  assert.equal(available(open(deps(false))), true);
});
