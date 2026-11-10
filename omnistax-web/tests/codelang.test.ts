/* Code listings in four languages (METHOD decision 20 of the CS book): the languages and their order
   (code/langs.ts), the reader's code language per book (settings/codelang.ts), a debugger trace laid over
   several languages through a line map and per-language blocks (fig/trace.ts), the code panel that switches
   among them and keeps its stop (fig/codepanel.ts, on a small fake DOM), and the code set of the text as the
   build prints it (content/codeset.ts). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LISTING_LANGS, LISTING_LABELS, inOrder, parseMaker, pickLang } from '../src/lib/code/langs';
import { codeLangKey, codeLangOf, onCodeLang, parseCodeLang, setCodeLang } from '../src/lib/settings/codelang';
import * as TR from '../src/lib/fig/trace';
import { attrKey, codePanel, tokenize } from '../src/lib/fig/codepanel';
import { codeSets, codeSetsOf, renderCodeSet } from '../src/lib/content/codeset';
import { categoryOf, recordIssue } from '../src/lib/backup/schema';
import { describeRecord } from '../src/lib/sync/describe';

/* ---------- the languages ---------- */

test('the languages are pseudocode, Python, Java, C++ and JavaScript, in that order; pseudocode is shown unchosen, Python where a listing lacks it', () => {
  assert.deepEqual([...LISTING_LANGS], ['pseudocode', 'python', 'java', 'cpp', 'javascript']);
  assert.deepEqual(LISTING_LANGS.map((l) => LISTING_LABELS[l]), ['Pseudocode', 'Python', 'Java', 'C++', 'JavaScript']);
  assert.deepEqual(inOrder(['javascript', 'cpp', 'rust', 'python', 'pseudocode', 'cpp']), ['pseudocode', 'python', 'cpp', 'javascript']);
  assert.equal(pickLang(['python', 'java'], 'java'), 'java');
  assert.equal(pickLang(['python', 'java'], 'cpp'), 'python', 'a language the listing lacks falls back to Python');
  assert.equal(pickLang(['javascript', 'java'], 'cpp'), 'java', 'and without Python to the first in the book’s order');
  assert.equal(pickLang(['python'], null), 'python');
  assert.equal(pickLang(['pseudocode', 'python', 'java'], 'pseudocode'), 'pseudocode', 'the default shows a listing’s pseudocode');
  assert.equal(pickLang(['python', 'java'], 'pseudocode'), 'python', 'and Python where the listing has none');
  assert.equal(pickLang(['pseudocode', 'python'], 'java'), 'python', 'a chosen language a listing lacks is Python, never pseudocode');
});

test('a translation names its maker as a model id and an effort', () => {
  assert.deepEqual(parseMaker('claude-opus-5-5 high'), { model: 'claude-opus-5-5', effort: 'high' });
  assert.deepEqual(parseMaker(' claude-opus-5-5 '), { model: 'claude-opus-5-5' });
  assert.equal(parseMaker(''), null);
  assert.equal(parseMaker('claude-opus-5-5 huge'), null);
  assert.equal(parseMaker('a b c'), null);
});

/* ---------- the preference ---------- */

test('the code language is the book’s, the default (pseudocode, else Python) until chosen, and a choice reaches every listener with its book', () => {
  assert.equal(codeLangKey('cs'), 'omnistax-code-lang-cs');
  assert.equal(parseCodeLang('"java"'), 'java');
  assert.equal(parseCodeLang('"rust"'), null);
  assert.equal(parseCodeLang('java'), null, 'stored as JSON');
  assert.equal(parseCodeLang(null), null);
  assert.equal(codeLangOf('pref-book'), 'pseudocode');
  const heard: string[] = [];
  const stop = onCodeLang((book, lang) => heard.push(`${book}:${lang}`));
  setCodeLang('pref-book', 'cpp');
  assert.equal(codeLangOf('pref-book'), 'cpp');
  assert.equal(codeLangOf('other-book'), 'pseudocode', 'each book keeps its own');
  setCodeLang('pref-book', 'rust' as never);
  stop();
  setCodeLang('pref-book', 'pseudocode');
  assert.deepEqual(heard, ['pref-book:cpp']);
  assert.equal(codeLangOf('pref-book'), 'pseudocode');
});

test('the code language travels with a backup and a sync, as an appearance record of its book', () => {
  assert.equal(categoryOf('omnistax-code-lang-cs'), 'appearance');
  assert.equal(recordIssue({ key: 'omnistax-code-lang-cs', value: '"java"' }), null);
  assert.notEqual(recordIssue({ key: 'omnistax-code-lang-cs', value: '"rust"' }), null);
  assert.equal(describeRecord('omnistax-code-lang-cs', 'en', () => 'The Book'), 'Code language for The Book');
});

/* ---------- one trace, several languages ---------- */

/* the two-sum loop in Python (canonical) and in Java, which opens and closes its blocks on lines of their own:
     python                              java
   1 def pair_sum(nums, target):       1 int[] pairSum(int[] nums, int target) {
   2     i, j = 0, len(nums) - 1        2     int i = 0;
   3     while i < j:                   3     int j = nums.length - 1;
   4         s = nums[i] + nums[j]      4     while (i < j) {
   5         if s == target:            5         int s = nums[i] + nums[j];
   6             return [i, j]          6         if (s == target) return new int[] {i, j};
   7         if s < target:             7         if (s < target) {
   8             i += 1                 8             i += 1;
   9         else:                      9         } else {
  10             j -= 1                10             j -= 1;
  11     return None                   11         }
                                       12     }
                                       13     return null;
                                       14 } */
const PY = ['def pair_sum(nums, target):', '    i, j = 0, len(nums) - 1', '    while i < j:', '        s = nums[i] + nums[j]', '        if s == target:', '            return [i, j]', '        if s < target:', '            i += 1', '        else:', '            j -= 1', '    return None'].join('\n');
const JAVA = ['int[] pairSum(int[] nums, int target) {', '    int i = 0;', '    int j = nums.length - 1;', '    while (i < j) {', '        int s = nums[i] + nums[j];', '        if (s == target) return new int[] {i, j};', '        if (s < target) {', '            i += 1;', '        } else {', '            j -= 1;', '        }', '    }', '    return null;', '}'].join('\n');
const JAVA_MAP: TR.LineMap = { 1: 1, 2: [2, 3], 3: 4, 4: 5, 5: 6, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 13 };
const BLOCKS: TR.LangBlockSpec<'python' | 'java'>[] = [
  { id: 'init', lines: [2, 2], label: 'start at both ends', touches: ['i', 'j'] },
  { id: 'loop', lines: { python: [3, 10], java: [4, 12] }, label: 'one comparison', touches: ['i', 'j', 's'] },
  { id: 'move', lines: [7, 10], label: 'move a pointer', touches: ['i', 'j'] },
];

test('a line map carries canonical lines, and ranges, into another language; no map is the canonical language', () => {
  assert.deepEqual(TR.mapLine(undefined, 4), [4]);
  assert.deepEqual(TR.mapLine(JAVA_MAP, 2), [2, 3]);
  assert.deepEqual(TR.mapLine(JAVA_MAP, 12), [], 'a line the map does not name stands for no line');
  assert.deepEqual([...TR.mapLines(JAVA_MAP, [2, 5, 6])].sort((a, b) => a - b), [2, 3, 6]);
  assert.deepEqual(TR.mapRange(JAVA_MAP, [7, 10]), [7, 10]);
  assert.deepEqual(TR.mapRange(JAVA_MAP, [2, 3]), [2, 4]);
  assert.deepEqual(TR.mapRange(JAVA_MAP, [12, 12]), null);
  assert.deepEqual(TR.mapErrors(JAVA_MAP, 11, 14), []);
  assert.deepEqual(TR.mapErrors({ 12: 1, 3: [4, 15], 4: 1.5 }, 11, 14), [
    'maps line 3 to 15, which is no line of its code (14 lines)',
    'maps line 4 to 1.5, which is no line of its code (14 lines)',
    'maps line 12, which the canonical code does not have (11 lines)',
  ]);
});

test('blocks keep one id with lines per language: the trace steps on the canonical lines, each language shows its own', () => {
  const { blocks, errors } = TR.canonicalBlocks(BLOCKS, 'python');
  assert.deepEqual(errors, []);
  assert.deepEqual(blocks.map((b) => b.lines), [[2, 2], [3, 10], [7, 10]]);
  assert.deepEqual(TR.canonicalBlocks<'python' | 'java'>([{ id: 'x', lines: { java: [1, 2] } }], 'python').errors, ['block "x" gives no lines in python, the language its trace is recorded in']);
  assert.deepEqual(TR.blockRange(BLOCKS[0], 'java', 'python', JAVA_MAP), [2, 3], 'a single range is mapped');
  assert.deepEqual(TR.blockRange(BLOCKS[1], 'java', 'python', JAVA_MAP), [4, 12], 'a range given for the language is its own');
  assert.deepEqual(TR.blockRange(BLOCKS[1], 'python', 'python', JAVA_MAP), [3, 10]);
  /* the stepping is the same whichever language is shown: it never reads the shown lines */
  const t = TR.tree(blocks);
  const frames = TR.record((at) => { at(2, { i: 0, j: 3 }); at(3); at(4, { s: 5 }); at(5); at(7); at(8, { i: 1 }); at(3); at(4, { s: 6 }); at(5); at(6); });
  const laid = TR.lay(frames, t);
  assert.deepEqual(TR.stopsAt(laid, 0), [0, 5, 9]);
  assert.deepEqual([...TR.mapLines(JAVA_MAP, TR.executed(laid, 0, 5))].sort((a, b) => a - b), [4, 5, 6, 7, 8]);
});

/* ---------- the code panel, on a fake DOM ---------- */

type FakeEl = {
  tagName: string; className: string; children: FakeEl[]; parent: FakeEl | null; text: string; hidden: boolean;
  dataset: Record<string, string>; attrs: Record<string, string>; style: Record<string, string> & { setProperty: (k: string, v: string) => void };
  classList: { add: (c: string) => void; remove: (c: string) => void; toggle: (c: string, on?: boolean) => boolean; contains: (c: string) => boolean };
  listeners: Record<string, (() => void)[]>; ownerDocument: FakeDoc; offsetHeight: number; innerHTML: string;
  appendChild: (c: FakeEl) => FakeEl; remove: () => void; setAttribute: (k: string, v: string) => void; getAttribute: (k: string) => string | null;
  addEventListener: (k: string, f: () => void) => void; closest: () => null; textContent: string;
  removeAttribute: (k: string) => void; replaceChildren: (...c: FakeEl[]) => void; querySelectorAll: (sel: string) => FakeEl[]; title: string;
};
type FakeDoc = { createElement: (t: string) => FakeEl; createTextNode: (s: string) => FakeEl; documentElement: { dataset: Record<string, string> } };
const fakeDoc = (): FakeDoc => {
  const doc: FakeDoc = { createElement: (t) => mk(t), createTextNode: (s) => { const e = mk('#text'); e.text = s; return e; }, documentElement: { dataset: {} } };
  function mk(tagName: string): FakeEl {
    const classes = new Set<string>();
    const e = {
      tagName, children: [] as FakeEl[], parent: null as FakeEl | null, text: '', hidden: false, dataset: {} as Record<string, string>, attrs: {} as Record<string, string>,
      style: Object.assign({} as Record<string, string>, { setProperty(k: string, v: string) { (e.style as Record<string, string>)[k] = v; } }),
      classList: { add: (c: string) => { classes.add(c); }, remove: (c: string) => { classes.delete(c); }, contains: (c: string) => classes.has(c), toggle: (c: string, on?: boolean) => { const v = on ?? !classes.has(c); if (v) classes.add(c); else classes.delete(c); return v; } },
      listeners: {} as Record<string, (() => void)[]>, ownerDocument: doc, offsetHeight: 0, innerHTML: '',
      get className() { return [...classes].join(' '); }, set className(v: string) { classes.clear(); v.split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); },
      get textContent(): string { return e.tagName === '#text' ? e.text : e.children.map((c) => c.textContent).join(''); },
      set textContent(v: string) { e.children = []; if (v) { const tx = mk('#text'); tx.text = v; e.children.push(tx); } },
      appendChild(c: FakeEl) { c.parent = e as unknown as FakeEl; e.children.push(c); return c; },
      remove() { const p = e.parent; if (p) p.children = p.children.filter((c) => c !== (e as unknown as FakeEl)); },
      setAttribute(k: string, v: string) { e.attrs[k] = v; }, getAttribute(k: string) { return e.attrs[k] ?? null; },
      removeAttribute(k: string) { delete e.attrs[k]; if (k === 'title') e.title = ''; }, title: '',
      replaceChildren(...c: FakeEl[]) { e.children = []; c.forEach((x) => { x.parent = e as unknown as FakeEl; e.children.push(x); }); },
      querySelectorAll(sel: string) { return all(e as unknown as FakeEl, sel.replace(/^\./, '')).filter((x) => x !== (e as unknown as FakeEl)); },
      addEventListener(k: string, f: () => void) { (e.listeners[k] ??= []).push(f); }, closest: () => null,
    };
    return e as unknown as FakeEl;
  }
  return doc;
};
const all = (e: FakeEl, cls: string): FakeEl[] => [...(e.classList.contains(cls) ? [e] : []), ...e.children.flatMap((c) => all(c, cls))];
const lineClasses = (el: FakeEl, cls: string): number[] => all(el, 'cp-line').filter((r) => r.classList.contains(cls)).map((r) => Number(r.dataset.line));
const panelOf = (o: Partial<Parameters<typeof codePanel>[1]> = {}) => {
  const doc = fakeDoc(), host = doc.createElement('div');
  const errors: string[] = []; const was = console.error; console.error = (m: unknown) => { errors.push(String(m)); };
  try {
    const cp = codePanel(host as unknown as HTMLElement, { src: { python: PY, java: JAVA }, lineMap: { java: JAVA_MAP }, blocks: BLOCKS, ai: { java: 'claude-opus-5-5 high' }, refs: { i: '#a00', j: '#00a' }, book: 'panel-book', ...o });
    return { cp, el: cp.el as unknown as FakeEl, errors };
  } finally { console.error = was; }
};

test('a panel shows Python first, with a button per language, and marks a translation', () => {
  setCodeLang('panel-book', 'python');
  const { cp, el, errors } = panelOf();
  assert.deepEqual(errors, []);
  assert.equal(cp.lang, 'python'); assert.equal(cp.canonical, 'python'); assert.deepEqual(cp.langs, ['python', 'java']);
  assert.deepEqual(all(el, 'cp-lang').map((b) => `${b.textContent}:${b.attrs['aria-pressed']}`), ['Python:true', 'Java:false']);
  assert.equal(all(el, 'cp-line').length, 11);
  assert.equal(all(el, 'cp-ai')[0].hidden, true, 'the source’s Python wears no mark');
  assert.equal(cp.tree.blocks.find((b) => b.id === 'loop')?.lines.join(), '3,10', 'the tree is the canonical one');
});

test('switching language keeps the stop: the band, the lines run and the line it rests on follow the line map', () => {
  setCodeLang('panel-book', 'python');
  const { cp, el } = panelOf();
  const init = cp.tree.blocks.find((b) => b.id === 'init')!, move = cp.tree.blocks.find((b) => b.id === 'move')!;
  cp.show({ block: init, executed: new Set([2]), line: 2, touched: new Set(['i', 'j']) });
  assert.deepEqual(lineClasses(el, 'in'), [2]); assert.deepEqual(lineClasses(el, 'at'), [2]);
  const java = all(el, 'cp-lang')[1];
  java.listeners.click.forEach((f) => f());
  assert.equal(cp.lang, 'java', 'a click is the book’s choice, which the panel follows');
  assert.equal(codeLangOf('panel-book'), 'java');
  assert.equal(all(el, 'cp-line').length, 14);
  assert.deepEqual(lineClasses(el, 'in'), [2, 3], 'the stop shown before the switch is shown after it, in Java’s lines');
  assert.deepEqual(lineClasses(el, 'at'), [2, 3]);
  assert.equal(all(el, 'cp-note')[0].dataset.lines, 'lines 2–3');
  assert.equal(all(el, 'cp-ai')[0].hidden, false, 'the translation wears the AI mark');
  assert.match(all(el, 'cp-ai')[0].innerHTML, /title="Generated by Claude Opus 5\.5 · high effort"/);
  cp.show({ block: move, executed: new Set([4, 5, 7, 8]), line: 8 });
  assert.deepEqual(lineClasses(el, 'in'), [7, 8, 9, 10]);
  assert.deepEqual(lineClasses(el, 'ran'), [5, 6, 7, 8]);
  assert.equal(cp.shownLine(2), 2); assert.equal(cp.shownLine(11), 13);
  /* another panel of the same book opens on the book's language */
  const other = panelOf();
  assert.equal(other.cp.lang, 'java');
  setCodeLang('panel-book', 'cpp');
  assert.equal(cp.lang, 'python', 'a language the panel lacks shows Python');
  setCodeLang('panel-book', 'python');
});

test('referents are coloured per language where the names differ, and a lone string stays the old panel', () => {
  setCodeLang('refs-book', 'python');
  const { cp, el } = panelOf({ book: 'refs-book', refs: { python: { pair_sum: '#a00' }, java: { pairSum: '#a00' } } });
  cp.show({ block: null });
  assert.deepEqual(all(el, 'cp-var').map((v) => `${v.textContent}=${v.style.color}`), ['pair_sum=#a00']);
  cp.setLang('java');
  assert.deepEqual(all(el, 'cp-var').map((v) => `${v.textContent}=${v.style.color}`), ['pairSum=#a00']);
  assert.equal(cp.colour('pair_sum'), '#a00', 'the watch names the trace’s variables, the canonical ones');
  const plain = panelOf({ src: PY, lineMap: undefined, ai: undefined, blocks: [], book: '' });
  assert.equal(all(plain.el, 'cp-langs').length, 0, 'one language has no button group');
  assert.equal(plain.cp.lang, 'python');
});

test('the panel says what is wrong with its languages', () => {
  const bad = panelOf({ book: 'bad-book', src: { python: PY, java: JAVA, rust: 'fn x() {}' } as never, lineMap: { java: { 2: 40 } }, blocks: [{ id: 'b', lines: { java: [1, 2] } }] });
  assert.deepEqual(bad.errors, [
    'F.code: src names "rust", which is not one of pseudocode, python, java, cpp, javascript',
    'F.code: java maps line 2 to 40, which is no line of its code (14 lines)',
    'F.code: block "b" gives no lines in python, the language its trace is recorded in',
  ]);
  const unmapped = panelOf({ book: 'bad-book', lineMap: undefined, ai: undefined });
  assert.deepEqual(unmapped.errors, ['F.code: java has 14 lines and python 11, so it needs a lineMap']);
});

test('the tokenizer reads each language’s comments and strings', () => {
  const names = (src: string, l: Parameters<typeof tokenize>[1]) => tokenize(src, l).flat().filter((t) => t.t === 'name').map((t) => t.s);
  assert.deepEqual(names('int i = 0; // j\n/* k */ j', 'java'), ['int', 'i', 'j']);
  assert.deepEqual(names('#include <x>\nint i;', 'cpp'), ['include', 'x', 'int', 'i'], 'a # is no comment in C++');
  assert.deepEqual(names('i = 0 # j', 'python'), ['i']);
  assert.deepEqual(names('s = `i ${j}`', 'javascript'), ['s']);
  assert.deepEqual(names('s = `i`', 'java'), ['s', 'i'], 'a backtick quotes only in JavaScript');
});

test('the tokenizer reads an attribute of self or this as a token of its own, and leaves any other attribute out', () => {
  const toks = (src: string, l: Parameters<typeof tokenize>[1]) => tokenize(src, l).flat().filter((t) => t.t !== 'other' && t.t !== 'str' && t.t !== 'comment').map((t) => (t.t === 'attr' ? `${t.of}` : t.s));
  assert.deepEqual(toks('self.n = n + self.m.size', 'python'), ['self', 'self.n', 'n', 'self', 'self.m'], 'm.size: size is another attribute');
  assert.deepEqual(toks('this.n = node.next;', 'java'), ['this', 'this.n', 'node']);
  assert.deepEqual(toks('this.n += 1', 'javascript'), ['this', 'this.n']);
  assert.deepEqual(toks('this->n = p->next;', 'cpp'), ['this', 'this->n', 'p'], 'after -> a name is an attribute in C++');
  assert.deepEqual(toks('this.n', 'python'), ['this'], 'only Python’s own receiver counts in Python');
  assert.equal(tokenize('x = self.n  # n', 'python')[0].map((t) => t.s).join(''), 'x = self.n  # n', 'the tokens are still the line');
});

test('attrKey finds an attribute in refs only where refs names it with a receiver, in any language’s spelling', () => {
  assert.equal(attrKey({ 'self.n': '#a00' }, 'self.n'), 'self.n');
  assert.equal(attrKey({ 'self.n': '#a00' }, 'this->n'), 'self.n', 'one refs object serves C++');
  assert.equal(attrKey({ 'this.n': '#a00', 'self.n': '#0a0' }, 'this.n'), 'this.n', 'the spelling written wins');
  assert.equal(attrKey({ n: '#a00' }, 'self.n'), null, 'a bare n leaves self.n in ink');
});

test('a panel colours self.n as the referent named so, and keeps a bare n apart', () => {
  setCodeLang('attr-book', 'python');
  const src = { python: 'def add(self, x):\n    self.n += 1\n    n = 0', java: 'void add(int x) {\n    this.n += 1;\n    int n = 0; }' };
  const { cp, el } = panelOf({ book: 'attr-book', src, lineMap: undefined, ai: undefined, blocks: [], refs: { 'self.n': '#a00' } });
  cp.show({ block: null, touched: new Set(['self.n']) });
  assert.deepEqual(all(el, 'cp-var').map((v) => `${v.textContent}=${v.style.color}:${v.classList.contains('touched')}`), ['n=#a00:true'], 'the n of self.n, not the bare n');
  cp.setLang('java');
  assert.deepEqual(all(el, 'cp-var').map((v) => `${v.textContent}=${v.dataset.var}`), ['n=self.n'], 'this.n wears it in Java');
  const bare = panelOf({ book: 'attr-book', src, lineMap: undefined, ai: undefined, blocks: [], refs: { n: '#00a' } });
  bare.cp.show({ block: null });
  assert.deepEqual(all(bare.el, 'cp-var').map((v) => v.textContent), ['n'], 'a bare n colours only the bare n');
  assert.equal(all(bare.el, 'cp-code')[1].textContent, '    self.n += 1');
});

/* ---------- the code set of the text, as the build prints it ---------- */

test('the build gives a code set its button group and AI marks, and shows Python', () => {
  const html = '<p>Before.</p><div class="code-set"><pre data-lang="java" data-ai="claude-opus-5-5 high"><code>int x;</code></pre><pre data-lang="python"><code>x = 1</code></pre></div><pre><code>alone</code></pre>';
  const [set] = codeSetsOf(html);
  assert.deepEqual(set.variants.map((v) => [v.lang, v.ai ?? null]), [['java', 'claude-opus-5-5 high'], ['python', null]]);
  const out = codeSets(html, 'en');
  assert.ok(out.startsWith('<p>Before.</p><div class="code-set" data-langs="python java" data-shown="python">'));
  assert.ok(out.endsWith('</div><pre><code>alone</code></pre>'), 'a lone <pre> is left as it is');
  assert.match(out, /<span class="cs-langs" role="group" aria-label="Code language"><button type="button" class="cs-lang on" data-lang="python" aria-pressed="true">Python<\/button><button type="button" class="cs-lang" data-lang="java" aria-pressed="false">Java<\/button><\/span>/);
  assert.match(out, /<span class="cs-ai" data-lang="java" hidden><span class="ai-mark"[^>]*title="Generated by Claude Opus 5\.5 · high effort"/);
  assert.ok(out.indexOf('data-lang="python"><code>x = 1') < out.indexOf('data-lang="java" data-ai="claude-opus-5-5 high" hidden><code>int x;'), 'the variants stand in the book’s order, all but the one shown hidden');
  const one = renderCodeSet(codeSetsOf('<div class="code-set"><pre data-lang="cpp"><code>int x;</code></pre></div>')[0], 'zh-CN');
  assert.equal(one, '<div class="code-set" data-langs="cpp" data-shown="cpp"><pre data-lang="cpp"><code>int x;</code></pre></div>', 'one language, no head');
});

test('a panel shows the source’s pseudocode first, writes a fixed argument in as its value and says a variable’s value on the last line run that names it', () => {
  const doc = fakeDoc(), host = doc.createElement('div');
  const cp = codePanel(host as unknown as HTMLElement, {
    src: { pseudocode: 'Count(n):\n  for i ← 1 to n\n      Sing “i of n”', python: 'def count(n):\n    for i in range(1, n + 1):\n        print(i, n)' },
    refs: { i: 'teal' }, book: '',
  });
  const el = host.children[0];
  assert.deepEqual(cp.langs, ['pseudocode', 'python']);
  assert.equal(cp.lang, 'pseudocode', 'unchosen, the pseudocode is shown');
  assert.equal(cp.canonical, 'python', 'the trace is still numbered in Python');
  assert.deepEqual(all(el, 'cp-lang').map((b) => b.textContent), ['Pseudocode', 'Python']);
  cp.show({ block: null, executed: new Set([2, 3]), line: 3, values: new Map([['i', '2'], ['n', '5']]), consts: new Map([['n', '5']]) });
  const lineText = (k: number): string => all(el, 'cp-line')[k].children.filter((c) => c.classList.contains('cp-code')).map((c) => c.textContent).join('');
  assert.equal(lineText(0), 'Count(n):', 'the line that declares the argument keeps its name');
  assert.equal(lineText(1), '  for i ← 1 to 5');
  assert.equal(lineText(2), '      Sing “i of 5”', 'pseudocode has no strings: a name inside quotes is the variable');
  assert.deepEqual(all(el, 'cp-sub').map((v) => v.title), ['n', 'n'], 'a value written in says its name on hover');
  assert.deepEqual(all(el, 'cp-inlay').map((b) => b.textContent), ['', '', 'i = 2'], 'i says its value once, on the last line run that names it; n is already in the code');
  assert.equal(all(el, 'cp-args')[0].textContent, 'n = 5', 'the call row says what the run is on');
  cp.setLang('python');
  assert.equal(lineText(1), '    for i in range(1, 5 + 1):');
  assert.equal(lineText(2), '        print(i, 5)');
});
