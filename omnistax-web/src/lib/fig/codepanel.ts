/* F.code: the code a debugger figure steps through, as page text in the mono font (root rule 26.9) beside
   its drawing (docs/design-code-and-debugger.md §2.1). No syntax colouring: the only colour on the code is
   a referent's, on the variable names the figure names in `refs`, so `i` in the code wears the colour of
   the pointer i in the drawing. The block being shown wears a band and its label sits under the code as
   the figure's note; the lines the last step ran are marked in the gutter, the last of them most.

   The tokenizer is deliberately tiny: it finds names outside strings and comments, which is all the
   colouring needs, and carries a multi-line string or comment across lines. The styles are in global.css
   under `.cp`. */
import type { BlockSpec, Block, Tree } from './trace';
import { tree as treeOf } from './trace';
import { t as msg } from '../i18n';

export type Lang = 'python' | 'javascript';
export type Tok = { readonly t: 'name' | 'str' | 'comment' | 'other'; readonly s: string };

type Mode = null | { readonly end: string; readonly t: 'str' | 'comment' };
const NAME = /[A-Za-z_$][A-Za-z0-9_$]*/y;
/* the lines of src as tokens; joined back, each line's tokens are exactly that line */
export function tokenize(src: string, lang: Lang): Tok[][] {
  const out: Tok[][] = [];
  let mode: Mode = null;
  for (const line of src.split('\n')) {
    const toks: Tok[] = [];
    const push = (t: Tok['t'], s: string): void => {
      if (!s) return;
      const last = toks[toks.length - 1];
      if (last && last.t === t && t !== 'name') toks[toks.length - 1] = { t, s: last.s + s }; else toks.push({ t, s });
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
      if ((lang === 'python' && c === '#') || (lang === 'javascript' && line.startsWith('//', i))) { push('comment', line.slice(i)); i = line.length; break; }
      if (lang === 'javascript' && line.startsWith('/*', i)) { push('comment', '/*'); i += 2; mode = { end: '*/', t: 'comment' }; carry(); continue; }
      if (c === '"' || c === "'" || (lang === 'javascript' && c === '`')) {
        const triple = lang === 'python' && line.startsWith(c.repeat(3), i);
        const q = triple ? c.repeat(3) : c;
        push('str', q); i += q.length; mode = { end: q, t: 'str' }; carry(); continue;
      }
      NAME.lastIndex = i;
      const m = NAME.exec(line);
      /* after a digit it is part of a number (1e5, 0x1f); after a dot it is an attribute, not the variable */
      if (m) { push(i > 0 && /[0-9.]/.test(line[i - 1]) ? 'other' : 'name', m[0]); i += m[0].length; continue; }
      push('other', c); i += 1;
    }
    out.push(toks);
  }
  return out;
}

export type CodeOpts = {
  readonly lang?: Lang;
  readonly src: string;
  readonly blocks?: readonly BlockSpec[];
  /* code names wearing a referent's colour: `{ i: () => F.ref('l') }`, read on every draw */
  readonly refs?: Readonly<Record<string, string | (() => string)>>;
};
export type Shown = { readonly block: Block | null; readonly executed?: ReadonlySet<number>; readonly line?: number; readonly touched?: ReadonlySet<string> };
export type Code = {
  readonly el: HTMLElement; readonly lang: Lang; readonly src: string; readonly lines: number; readonly tree: Tree;
  show: (s: Shown) => void;
  /* the colour of a code name, or null for ink */
  colour: (name: string) => string | null;
};

const LINE_EM = 1.5;   /* the line height the band is placed by, in em; global.css .cp-src holds the same */
export function codePanel(host: HTMLElement, o: CodeOpts): Code {
  const lang: Lang = o.lang ?? 'python';
  const src = o.src.replace(/\s+$/, '');
  const t = treeOf(o.blocks ?? []);
  t.errors.forEach((e) => console.error(`F.code: ${e}`));
  const doc = host.ownerDocument;
  const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = doc.createElement(tag); e.className = cls; return e; };
  const el = mk('div', 'cp'); el.setAttribute('role', 'group'); el.setAttribute('aria-label', msg('fig.code.label'));
  const body = el.appendChild(mk('div', 'cp-body'));
  const pre = body.appendChild(mk('pre', 'cp-src')); pre.style.setProperty('--cp-lh', `${LINE_EM}em`);
  const band = pre.appendChild(mk('span', 'cp-band')); band.setAttribute('aria-hidden', 'true');
  const note = el.appendChild(mk('div', 'cp-note'));
  const toks = tokenize(src, lang);
  const names: { name: string; el: HTMLElement }[] = [];
  const rows = toks.map((line, n) => {
    const row = pre.appendChild(mk('span', 'cp-line')); row.dataset.line = String(n + 1);
    const no = row.appendChild(mk('span', 'cp-no')); no.textContent = String(n + 1); no.setAttribute('aria-hidden', 'true');
    const code = row.appendChild(mk('span', 'cp-code'));
    line.forEach((tk) => {
      if (tk.t === 'name' && o.refs && Object.prototype.hasOwnProperty.call(o.refs, tk.s)) {
        const v = code.appendChild(mk('span', 'cp-var')); v.textContent = tk.s; v.dataset.var = tk.s; names.push({ name: tk.s, el: v });
      } else code.appendChild(doc.createTextNode(tk.s));
    });
    if (!line.length) code.appendChild(doc.createTextNode(' '));
    return row;
  });
  host.appendChild(el);
  const colour = (name: string): string | null => {
    const r = o.refs?.[name]; if (r === undefined) return null;
    return typeof r === 'function' ? r() : r;
  };
  let lastBlock: string | null | undefined;
  const show = (s: Shown): void => {
    const b = s.block;
    names.forEach(({ name, el: v }) => { v.style.color = colour(name) ?? ''; v.classList.toggle('touched', !!s.touched?.has(name)); });
    rows.forEach((row, n) => {
      const L = n + 1;
      row.classList.toggle('ran', !!s.executed?.has(L));
      row.classList.toggle('at', s.line === L);
      row.classList.toggle('in', !!b && L >= b.lines[0] && L <= b.lines[1]);
    });
    if (b) {
      band.style.top = `calc(var(--cp-pad) + ${b.lines[0] - 1} * var(--cp-lh))`;
      band.style.height = `calc(${b.lines[1] - b.lines[0] + 1} * var(--cp-lh))`;
      band.classList.add('on');
    } else band.classList.remove('on');
    const id = b ? b.id : null;
    if (id !== lastBlock) {
      lastBlock = id;
      note.textContent = b?.label ?? '';
      note.classList.toggle('on', !!b?.label);
      if (b) note.dataset.lines = b.lines[0] === b.lines[1] ? msg('fig.code.line', { n: b.lines[0] }) : msg('fig.code.lines', { a: b.lines[0], b: b.lines[1] });
      else delete note.dataset.lines;
    }
  };
  return { el, lang, src, lines: rows.length, tree: t, show, colour };
}
