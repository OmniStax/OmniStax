/* F.code: the code a debugger figure steps through, as page text in the mono font (root rule 26.9) beside
   its drawing (docs/design-code-and-debugger.md §2.1). No syntax colouring: the only colour on the code is
   a referent's, on the variable names the figure names in `refs`, so `i` in the code wears the colour of
   the pointer i in the drawing. The block being shown wears a band and its label sits under the code as
   the figure's note; the lines the last step ran are marked in the gutter, the last of them most.

   The code may be given in several languages (Python, Java, C++, JavaScript; METHOD decision 20 of the CS
   book). A button group on the panel's head switches among them, and the choice is the reader's code
   language for the whole book (settings/codelang.ts): every panel and every code set of the book follows it.
   The trace is recorded once, in the canonical language's line numbers (Python unless the figure says), and
   each other language maps those lines to its own (trace.ts, LineMap), so a switch keeps the stop the
   reader is on and only redraws the code. A language the AI translated wears the AI mark beside the group.

   The tokenizer is deliberately tiny: it finds names outside strings and comments, which is all the
   colouring needs, and carries a multi-line string or comment across lines. The styles are in global.css
   under `.cp`. */
import type { Block, Tree, LangBlockSpec, LineMap, Range } from './trace';
import { tree as treeOf, canonicalBlocks, blockRange, mapLines, mapLine, mapErrors } from './trace';
import { t as msg, currentLocale } from '../i18n';
import { LISTING_LABELS, LISTING_LANGS, inOrder, isListingLang, parseMaker, pickLang, type ListingLang } from '../code/langs';
import { codeLangOf, onCodeLang, setCodeLang } from '../settings/codelang';
import { aiMarkHtml } from '../../components/ui/aimark';
import { aiByline } from '../content/attribution';

export type Lang = ListingLang;
/* An `attr` is an attribute of the object itself, the `n` of Python's `self.n`, Java's and JavaScript's
   `this.n` or C++'s `this->n`; `of` is the whole access as written, which `refs` may name it by. Any other
   attribute name (`node.next`, `p->next`) is `other`, as a number's letters are. */
export type Tok = { readonly t: 'name' | 'str' | 'comment' | 'other'; readonly s: string } | { readonly t: 'attr'; readonly s: string; readonly of: string };

type Mode = null | { readonly end: string; readonly t: 'str' | 'comment' };
const NAME = /[A-Za-z_$][A-Za-z0-9_$]*/y;
/* the lines of src as tokens; joined back, each line's tokens are exactly that line */
export function tokenize(src: string, lang: Lang): Tok[][] {
  const out: Tok[][] = [];
  const hash = lang === 'python', slashes = !hash, backtick = lang === 'javascript', triples = lang === 'python' || lang === 'java';
  let mode: Mode = null;
  for (const line of src.split('\n')) {
    const toks: Tok[] = [];
    const push = (t: Exclude<Tok['t'], 'attr'>, s: string): void => {
      if (!s) return;
      const last = toks[toks.length - 1];
      if (last && last.t === t && t !== 'name') toks[toks.length - 1] = { t, s: last.s + s }; else toks.push({ t, s });
    };
    /* the receiver an attribute at i is read off: `self.` / `this.` / `this->` straight before it, else nothing */
    const receiver = (): string | null => {
      const m = (lang === 'python' ? /\bself\.$/ : lang === 'cpp' ? /\bthis->$/ : /\bthis\.$/).exec(line.slice(0, i));
      return m ? m[0] : null;
    };
    let i = 0;
    /* the rest of a string or comment carried from an earlier line, or from earlier in this one */
    const carry = (): void => {
      if (!mode) return;
      const m = mode;
      let j = i;
      for (; j < line.length; j += 1) {
        if (m.t === 'str' && line[j] === '\\') { j += 1; continue; }
        if (line.startsWith(m.end, j)) { j += m.end.length; mode = null; break; }
      }
      push(m.t, line.slice(i, j)); i = j;
      if (mode && m.t === 'str' && m.end.length === 1 && m.end !== '`') mode = null;   /* a plain quote does not cross a line */
    };
    carry();
    while (i < line.length) {
      const c = line[i];
      if ((hash && c === '#') || (slashes && line.startsWith('//', i))) { push('comment', line.slice(i)); i = line.length; break; }
      if (slashes && line.startsWith('/*', i)) { push('comment', '/*'); i += 2; mode = { end: '*/', t: 'comment' }; carry(); continue; }
      if (c === '"' || c === "'" || (backtick && c === '`')) {
        const triple = triples && line.startsWith(c.repeat(3), i);
        const q = triple ? c.repeat(3) : c;
        push('str', q); i += q.length; mode = { end: q, t: 'str' }; carry(); continue;
      }
      NAME.lastIndex = i;
      const m = NAME.exec(line);
      /* after a digit it is part of a number (1e5, 0x1f); after a dot (or C++'s ->) it is an attribute, not the variable,
         and an attribute of self or this is a token of its own, which refs may colour by its whole access */
      if (m) {
        const own = receiver();
        if (own !== null) toks.push({ t: 'attr', s: m[0], of: own + m[0] });
        else push(i > 0 && (/[0-9.]/.test(line[i - 1]) || (lang === 'cpp' && line.startsWith('->', i - 2))) ? 'other' : 'name', m[0]);
        i += m[0].length; continue;
      }
      push('other', c); i += 1;
    }
    out.push(toks);
  }
  return out;
}

type Ref = string | (() => string);
type Refs = Readonly<Record<string, Ref>>;
export type CodeOpts = {
  /* the language of `src` where it is one string */
  readonly lang?: Lang;
  /* the code, verbatim: one string, or one per language `{ python, java, cpp, javascript }` */
  readonly src: string | Readonly<Partial<Record<Lang, string>>>;
  /* the language the trace's line numbers are in; Python, else the first language given */
  readonly canonical?: Lang;
  /* per other language, canonical line → its line or lines; absent, its lines are the canonical ones */
  readonly lineMap?: Readonly<Partial<Record<Lang, LineMap>>>;
  /* the languages the AI translated, each with what translated it: `{ java: 'claude-opus-5-5 high' }` */
  readonly ai?: Readonly<Partial<Record<Lang, string>>>;
  /* one id each; `lines` one range (the canonical language's) or per language `{ python: [5, 6], java: [7, 9] }` */
  readonly blocks?: readonly LangBlockSpec<Lang>[];
  /* code names wearing a referent's colour: `{ i: () => F.ref('l') }`, read on every draw; or per language,
     `{ python: { two_sum: … }, java: { twoSum: … } }`, where the names differ. An attribute of the object
     itself is named with its receiver, `{ 'self.n': … }`, which also colours `this.n` and `this->n`; the
     `n` of `self.n` wears that colour, and a bare `n` in refs leaves `self.n` in ink */
  readonly refs?: Refs | Readonly<Partial<Record<Lang, Refs>>>;
  /* the book whose code language the panel follows; absent, the one the panel stands in */
  readonly book?: string;
};
export type Shown = { readonly block: Block | null; readonly executed?: ReadonlySet<number>; readonly line?: number; readonly touched?: ReadonlySet<string> };
export type Code = {
  readonly el: HTMLElement;
  /* the language shown, its code and its number of lines */
  readonly lang: Lang; readonly src: string; readonly lines: number;
  readonly langs: readonly Lang[]; readonly canonical: Lang;
  /* the canonical blocks the trace is stepped on */
  readonly tree: Tree;
  show: (s: Shown) => void;
  /* the colour of a code name, or null for ink */
  colour: (name: string) => string | null;
  /* show another language, as a click on its button does, but for this panel only */
  setLang: (l: Lang) => void;
  /* told after the language shown changes */
  onLang: (f: (l: Lang) => void) => void;
  /* a canonical line as the language shown numbers it (its first line where it maps to several) */
  shownLine: (line: number) => number;
};

const has = (refs: Refs, k: string): boolean => Object.prototype.hasOwnProperty.call(refs, k);
/* The refs key an attribute of the object itself wears: its access as written (`this->n`), else the same access
   in another language's spelling (`self.n`, `this.n`, `this->n`), so one refs object serves every language.
   A bare `n` in refs never colours `self.n`: the attribute is coloured only where refs names it as one. */
const RECEIVERS = ['self.', 'this.', 'this->'] as const;
export const attrKey = (refs: Refs, of: string): string | null => {
  if (has(refs, of)) return of;
  const name = of.replace(/^(?:self\.|this\.|this->)/, '');
  return RECEIVERS.map((r) => r + name).find((k) => has(refs, k)) ?? null;
};
const isPerLang = (r: CodeOpts['refs']): r is Readonly<Partial<Record<Lang, Refs>>> =>
  !!r && Object.keys(r).length > 0 && Object.entries(r).every(([k, v]) => isListingLang(k) && typeof v === 'object' && v !== null);
const sources = (o: CodeOpts): Partial<Record<Lang, string>> => {
  if (typeof o.src === 'string') return { [o.lang ?? 'python']: o.src.replace(/\s+$/, '') };
  const out: Partial<Record<Lang, string>> = {};
  Object.entries(o.src).forEach(([k, v]) => {
    if (!isListingLang(k)) { console.error(`F.code: src names "${k}", which is not one of ${LISTING_LANGS.join(', ')}`); return; }
    if (typeof v === 'string') out[k] = v.replace(/\s+$/, '');
  });
  return out;
};

/* Every panel on the page, held weakly, so a change of a book's code language reaches each without keeping a
   figure that has gone. */
const panels = new Set<WeakRef<{ book: string; follow: (l: Lang) => void }>>();
let listening = false;
const listen = (): void => {
  if (listening) return;
  listening = true;
  onCodeLang((book, lang) => {
    panels.forEach((w) => { const p = w.deref(); if (!p) { panels.delete(w); return; } if (p.book === book) p.follow(lang); });
  });
};

const LINE_EM = 1.5;   /* the line height the band is placed by, in em; global.css .cp-src holds the same */
export function codePanel(host: HTMLElement, o: CodeOpts): Code {
  const srcs = sources(o);
  const langs = inOrder(Object.keys(srcs));
  if (!langs.length) { console.error('F.code: no code'); srcs.python = ''; langs.push('python'); }
  const canonical: Lang = o.canonical && srcs[o.canonical] !== undefined ? o.canonical : langs.includes('python') ? 'python' : langs[0];
  if (o.canonical && srcs[o.canonical] === undefined) console.error(`F.code: canonical is ${o.canonical}, whose code is not given`);
  const lineCount = (l: Lang): number => (srcs[l] ?? '').replace(/\s+$/, '').split('\n').length;
  const maps: Partial<Record<Lang, LineMap>> = {};
  langs.filter((l) => l !== canonical).forEach((l) => {
    const m = o.lineMap?.[l];
    if (m) { maps[l] = m; mapErrors(m, lineCount(canonical), lineCount(l)).forEach((e) => console.error(`F.code: ${l} ${e}`)); }
    else if (lineCount(l) !== lineCount(canonical)) console.error(`F.code: ${l} has ${lineCount(l)} lines and ${canonical} ${lineCount(canonical)}, so it needs a lineMap`);
  });
  const specs = o.blocks ?? [];
  const canon = canonicalBlocks(specs, canonical);
  const t = treeOf(canon.blocks);
  [...canon.errors, ...t.errors].forEach((e) => console.error(`F.code: ${e}`));
  const specOf = new Map(specs.map((b) => [b.id, b] as const));
  /* a block's lines in a language, checked once against that language's code */
  langs.forEach((l) => specs.forEach((b) => {
    const r = blockRange(b, l, canonical, maps[l]);
    if (r && (r[0] < 1 || r[1] > lineCount(l) || r[1] < r[0])) console.error(`F.code: block "${b.id}" lines [${r[0]}, ${r[1]}] are not lines of its ${l} code`);
  }));
  const refsOf = (l: Lang): Refs => {
    const r = o.refs; if (!r) return {};
    if (!isPerLang(r)) return r as Refs;
    return r[l] ?? r[canonical] ?? {};
  };
  const book = o.book ?? host.closest<HTMLElement>('[data-book]')?.dataset.book ?? host.ownerDocument.documentElement.dataset.book ?? '';

  const doc = host.ownerDocument;
  const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = doc.createElement(tag); e.className = cls; return e; };
  const el = mk('div', 'cp'); el.setAttribute('role', 'group'); el.setAttribute('aria-label', msg('fig.code.label'));
  /* the head: the button group, where there is more than one language, and the AI mark of a translation */
  const head = langs.length > 1 || o.ai ? el.appendChild(mk('div', 'cp-head')) : null;
  const group = head && langs.length > 1 ? head.appendChild(mk('div', 'cp-langs')) : null;
  group?.setAttribute('role', 'group'); group?.setAttribute('aria-label', msg('fig.code.language'));
  const buttons = new Map<Lang, HTMLButtonElement>();
  langs.forEach((l) => {
    if (!group) return;
    const b = group.appendChild(mk('button', 'cp-lang')); b.type = 'button'; b.dataset.lang = l; b.textContent = LISTING_LABELS[l];
    b.addEventListener('click', () => { if (book) setCodeLang(book, l); else setLang(l); });
    buttons.set(l, b);
  });
  const mark = head ? head.appendChild(mk('span', 'cp-ai')) : null;
  const bylineOf = (l: Lang): string | null => {
    const s = o.ai?.[l]; if (s === undefined) return null;
    const m = parseMaker(s);
    if (!m) { console.error(`F.code: ai.${l} is "${s}", not "<model id> [low|medium|high|max]"`); return msg('content.ai.mark'); }
    return aiByline([m], currentLocale()) ?? msg('content.ai.mark');
  };
  const body = el.appendChild(mk('div', 'cp-body'));
  const pre = body.appendChild(mk('pre', 'cp-src')); pre.style.setProperty('--cp-lh', `${LINE_EM}em`);
  const band = pre.appendChild(mk('span', 'cp-band')); band.setAttribute('aria-hidden', 'true');
  const note = el.appendChild(mk('div', 'cp-note'));
  host.appendChild(el);

  let cur: Lang = pickLang(langs, book ? codeLangOf(book) : null);
  let names: { name: string; el: HTMLElement }[] = [];
  let rows: HTMLElement[] = [];
  let last: Shown | null = null, lastBlock: string | null | undefined;
  const render = (): void => {
    rows.forEach((r) => r.remove());
    names = [];
    const refs = refsOf(cur);
    rows = tokenize(srcs[cur] ?? '', cur).map((line, n) => {
      const row = pre.appendChild(mk('span', 'cp-line')); row.dataset.line = String(n + 1);
      const no = row.appendChild(mk('span', 'cp-no')); no.textContent = String(n + 1); no.setAttribute('aria-hidden', 'true');
      const code = row.appendChild(mk('span', 'cp-code'));
      line.forEach((tk) => {
        const key = tk.t === 'name' ? (has(refs, tk.s) ? tk.s : null) : tk.t === 'attr' ? attrKey(refs, tk.of) : null;
        if (key !== null) {
          const v = code.appendChild(mk('span', 'cp-var')); v.textContent = tk.s; v.dataset.var = key; names.push({ name: key, el: v });
        } else code.appendChild(doc.createTextNode(tk.s));
      });
      if (!line.length) code.appendChild(doc.createTextNode(' '));
      return row;
    });
    el.dataset.lang = cur;
    buttons.forEach((b, l) => { b.setAttribute('aria-pressed', String(l === cur)); b.classList.toggle('on', l === cur); });
    if (mark) {
      const by = bylineOf(cur);
      mark.innerHTML = by === null ? '' : aiMarkHtml(by);
      mark.hidden = by === null;
    }
    lastBlock = undefined;
  };
  /* a referent's colour, by a name of the language shown, else by the trace's (canonical) name */
  const colour = (name: string): string | null => {
    const r = refsOf(cur)[name] ?? refsOf(canonical)[name]; if (r === undefined) return null;
    return typeof r === 'function' ? r() : r;
  };
  const rangeIn = (b: Block): Range | null => { const spec = specOf.get(b.id); return spec ? blockRange(spec, cur, canonical, maps[cur]) : b.lines; };
  const show = (s: Shown): void => {
    last = s;
    const b = s.block, map = cur === canonical ? undefined : maps[cur];
    const r = b ? rangeIn(b) : null;
    const ran = s.executed ? mapLines(map, s.executed) : new Set<number>();
    const at = new Set(s.line === undefined ? [] : mapLine(map, s.line));
    names.forEach(({ name, el: v }) => { v.style.color = colour(name) ?? ''; v.classList.toggle('touched', !!s.touched?.has(name)); });
    rows.forEach((row, n) => {
      const L = n + 1;
      row.classList.toggle('ran', ran.has(L));
      row.classList.toggle('at', at.has(L));
      row.classList.toggle('in', !!r && L >= r[0] && L <= r[1]);
    });
    if (r) {
      band.style.top = `calc(var(--cp-pad) + ${r[0] - 1} * var(--cp-lh))`;
      band.style.height = `calc(${r[1] - r[0] + 1} * var(--cp-lh))`;
      band.classList.add('on');
    } else band.classList.remove('on');
    const id = b ? b.id : null;
    if (id !== lastBlock) {
      lastBlock = id;
      note.textContent = b?.label ?? '';
      note.classList.toggle('on', !!b?.label);
      if (b && r) note.dataset.lines = r[0] === r[1] ? msg('fig.code.line', { n: r[0] }) : msg('fig.code.lines', { a: r[0], b: r[1] });
      else delete note.dataset.lines;
    }
  };
  const told: ((l: Lang) => void)[] = [];
  function setLang(l: Lang): void {
    const next = pickLang(langs, l);
    if (next === cur) return;
    cur = next;
    /* the band does not glide from the old language's lines to the new one's */
    band.style.transition = 'none';
    render();
    if (last) show(last);
    void band.offsetHeight; band.style.transition = '';
    told.forEach((f) => f(cur));
  }
  /* as wide as the widest language, so a switch does not move the drawing beside it */
  if (langs.length > 1) {
    const widest = Math.max(...langs.flatMap((l) => (srcs[l] ?? '').split('\n').map((x) => x.length)));
    pre.style.minWidth = `calc(${widest}ch + 3.4em + 14px)`;
  }
  render();
  if (book && langs.length > 1) {
    listen();
    /* the panel's element holds its follower, so the follower lives as long as the panel does */
    const follower = { book, follow: setLang };
    (el as HTMLElement & { cpFollow?: unknown }).cpFollow = follower;
    panels.add(new WeakRef(follower));
  }
  return {
    el, get lang() { return cur; }, get src() { return srcs[cur] ?? ''; }, get lines() { return rows.length; },
    langs, canonical, tree: t, show, colour, setLang, onLang: (f) => { told.push(f); },
    shownLine: (line) => (cur === canonical ? line : mapLine(maps[cur], line)[0] ?? line),
  };
}
