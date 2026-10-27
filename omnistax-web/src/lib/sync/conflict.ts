/* A file changed on both sides, as the reader settles it: the text of the
   merge taken this device's way and the text taken the repo's way, cut into
   the stretches they share and the conflicts between, each conflict settled on
   its own (this device's lines, the repo's, or both, this device's first) and
   the whole put back together. Pure. */
import { lineDiff } from './diff';
import { ABSENT, merge3 } from './merge';

export type Block =
  | { readonly kind: 'same'; readonly lines: readonly string[] }
  | { readonly kind: 'conflict'; readonly mine: readonly string[]; readonly theirs: readonly string[] };
export type Choice = 'mine' | 'theirs' | 'both';
/* One choice per conflict, in order; null where none is made yet. */
export type Choices = readonly (Choice | null)[];

const linesOf = (text: string): string[] => (text === '' ? [] : text.replace(/\n$/, '').split('\n'));

export const blocksOf = (mine: string, theirs: string): readonly Block[] => {
  const out: Block[] = [];
  let same: string[] = [], m: string[] = [], t: string[] = [];
  const flush = (): void => {
    if (m.length || t.length) { out.push({ kind: 'conflict', mine: m, theirs: t }); m = []; t = []; }
  };
  for (const l of lineDiff(linesOf(mine), linesOf(theirs))) {
    if (l.kind === 'same') { flush(); same.push(l.text); continue; }
    if (same.length) { out.push({ kind: 'same', lines: same }); same = []; }
    (l.kind === 'del' ? m : t).push(l.text);
  }
  flush();
  if (same.length) out.push({ kind: 'same', lines: same });
  return out;
};

export const conflictCount = (blocks: readonly Block[]): number => blocks.filter((b) => b.kind === 'conflict').length;

export const chosenLines = (b: Extract<Block, { kind: 'conflict' }>, c: Choice): readonly string[] =>
  c === 'mine' ? b.mine : c === 'theirs' ? b.theirs : [...b.mine, ...b.theirs];

/* The text the choices make, or null while a conflict is left unsettled. */
export const resolvedText = (blocks: readonly Block[], choices: Choices): string | null => {
  const lines: string[] = [];
  let i = 0;
  for (const b of blocks) {
    if (b.kind === 'same') { lines.push(...b.lines); continue; }
    const c = choices[i++] ?? null;
    if (c === null) return null;
    lines.push(...chosenLines(b, c));
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
};

/* The first key an object of this (parsed) JSON text names twice, or null.
   JSON.parse keeps the later of two and says nothing, so accepting both of
   two values of one key would quietly be the repo's value; the reader is told
   instead. */
export const duplicateKey = (text: string): string | null => {
  const stack: (Set<string> | null)[] = [];
  let expectKey = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      const raw = text.slice(i, j + 1), top = stack[stack.length - 1];
      i = j;
      if (top && expectKey) {
        let key: string;
        try { key = JSON.parse(raw) as string; } catch { return null; }
        if (top.has(key)) return key;
        top.add(key); expectKey = false;
      }
    } else if (c === '{') { stack.push(new Set()); expectKey = true; }
    else if (c === '[') stack.push(null);
    else if (c === '}' || c === ']') stack.pop();
    else if (c === ',') expectKey = !!stack[stack.length - 1];
  }
  return null;
};

export const jsonText =(v: unknown): string => (v === ABSENT || v === undefined ? '' : `${JSON.stringify(v, null, 2)}\n`);

/* Two versions of a file and the one they came from (null where a side has
   no file, or where the base could not be had), as the two texts the reader
   settles between: the structural merge when all three read as JSON, the two
   files as they are otherwise. `merged` is the merge when nothing conflicts. */
export type FileMerge = { readonly mine: string; readonly theirs: string; readonly merged: string | null };
const parsed = (text: string | null): { ok: true; v: unknown } | { ok: false } => {
  if (text === null) return { ok: true, v: ABSENT };
  try { return { ok: true, v: JSON.parse(text) as unknown }; } catch { return { ok: false }; }
};
export const mergeTexts = (base: string | null, mine: string | null, theirs: string | null): FileMerge => {
  const b = parsed(base), m = parsed(mine), t = parsed(theirs);
  if (!b.ok || !m.ok || !t.ok || m.v === ABSENT || t.v === ABSENT) return { mine: mine ?? '', theirs: theirs ?? '', merged: null };
  const r = merge3(b.v, m.v, t.v);
  const mt = jsonText(r.mine), tt = jsonText(r.theirs);
  return { mine: mt, theirs: tt, merged: r.conflicts.length ? null : mt };
};
