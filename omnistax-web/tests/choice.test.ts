import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openChoice, filter, key, perform, shown, type ChoiceList, type ChoiceStage } from '../src/lib/commands/choice';
import { builtinCommands, BUILTIN, type BuiltinDeps } from '../src/lib/commands/builtin';

const list = (log: string[]): ChoiceList => ({
  options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }, { value: 'c', label: 'Gamma' }],
  current: 'b',
  preview: (v) => log.push(`preview ${v}`), commit: (v) => log.push(`commit ${v}`), cancel: () => log.push('cancel'),
});
const press = (s: ChoiceStage, k: Parameters<typeof key>[1], log: string[]): ChoiceStage => { const r = key(s, k); perform(s.list, r.effect); return r.stage; };

test('a choice list opens on the current value', () => {
  const s = openChoice('Pick', list([]));
  assert.equal(shown(s)[s.sel].item.value, 'b');
});
test('moves wrap and preview each value they land on', () => {
  const log: string[] = []; let s = openChoice('Pick', list(log));
  s = press(s, 'down', log); s = press(s, 'down', log); s = press(s, 'up', log);
  assert.deepEqual(log, ['preview c', 'preview a', 'preview c']);
});
test('enter commits the highlighted value', () => {
  const log: string[] = []; let s = openChoice('Pick', list(log));
  s = press(s, 'up', log); press(s, 'enter', log);
  assert.deepEqual(log, ['preview a', 'commit a']);
});
test('escape cancels; backspace on an empty filter goes back, and only then', () => {
  const log: string[] = []; const s = openChoice('Pick', list(log));
  assert.equal(key(s, 'escape').effect.kind, 'cancel');
  assert.equal(key(s, 'backspace').effect.kind, 'back');
  assert.equal(key(filter(s, 'g'), 'backspace').effect.kind, 'none');
  press(s, 'escape', log); assert.deepEqual(log, ['cancel']);
});
test('typing filters with the fuzzy matcher and keeps the current value highlighted when shown', () => {
  const s = filter(openChoice('Pick', list([])), 'a');
  assert.ok(shown(s).length >= 2);
  assert.equal(shown(s)[s.sel].item.value, 'b');
  const g = filter(s, 'gam');
  assert.deepEqual(shown(g).map((r) => r.item.value), ['c']); assert.equal(g.sel, 0);
  assert.equal(key(filter(s, 'zzz'), 'enter').effect.kind, 'none');
});
test('font and theme commands preview, save and revert through the settings', () => {
  const log: string[] = [];
  const settings = {
    theme: 'system', figureFont: 'ncm', bodyFont: 'sourceSerif',
    setTheme: (t: string) => log.push(`theme ${t}`), setFigureFont: (f: string) => log.push(`figure ${f}`), setBodyFont: (f: string) => log.push(`body ${f}`),
    setPreview: (p: object) => log.push(`preview ${JSON.stringify(p)}`), clearPreview: () => log.push('clear'),
  };
  const cmds = builtinCommands({ settings } as unknown as BuiltinDeps);
  const by = (id: string) => cmds.find((c) => c.id === id)!;
  const fig = by(BUILTIN.figureFont).choices!();
  assert.equal(fig.options.length, 6); assert.equal(fig.current, 'ncm');
  fig.preview!('lmr'); fig.cancel!(); fig.commit('cmu');
  const th = by(BUILTIN.theme).choices!();
  th.preview!('dark'); th.commit('light');
  by(BUILTIN.bodyFont).choices!().commit('libertinus');
  assert.deepEqual(log, ['preview {"figureFont":"lmr"}', 'clear', 'figure cmu', 'clear', 'preview {"theme":"dark"}', 'theme light', 'clear', 'body libertinus', 'clear']);
});
