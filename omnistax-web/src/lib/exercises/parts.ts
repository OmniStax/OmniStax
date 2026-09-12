/* Many of the book's problems ask several things at once — (a), (b), (c) — and key
   them in one run of prose: "(a) $7910\ \text{m/s}$ (b) $1.12\times 10^{4}\ …$".
   Read whole, that run is one paragraph the reader has to unpick; read here, it is a
   row per part. Nothing is rewritten: the content keeps the book's own string and the
   card parses it as it draws. A string with no run of labels in it has no parts, and
   the card prints it whole, as it always has. Pure. */
import type { AnswerDTO } from '../content/schema';

/* A part as the book letters it, brackets and all: "(a)". */
export type PartLabel = string;
/* One part of a string that was written as parts. */
export type Part = { readonly label: PartLabel; readonly text: string };
/* A string read as parts: whatever stands before the first label, then the parts. */
export type Parted = { readonly lead: string; readonly parts: readonly Part[] };
/* One line of the card's solution: the label, then the middle — what the question
   asked for, or the working the book set down — and the answer itself in a column of
   its own, so that the answers read down the card. A part the book answers with a
   number alone says that number once, in the answer column. */
export type PartRow = { readonly label: PartLabel; readonly ask: string; readonly text: string; readonly value: string };
/* A solution laid out as rows, or no rows at all where it was not written as parts. */
export type SolutionParts = { readonly lead: string; readonly rows: readonly PartRow[] };

const LABEL = /\(([a-z])\)/gi;

/* A part's letter alone, so that the book's "(a)" and a key's "a" are the same part. */
export const letterOf = (label: string): string => label.replace(/[^a-z0-9]/gi, '').toLowerCase();

/* Whether an index falls inside math, counted by the dollars that open and close it.
   A label inside $…$ is algebra — $f(x)$ — and never a part of the question. */
const inMath = (s: string, at: number): boolean => {
  let open = false;
  for (let i = 0; i < at; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === '$') open = !open;
  }
  return open;
};

const nextLetter = (c: string): string => String.fromCharCode(c.charCodeAt(0) + 1);

/* The labels that make a run: the first "(a)" outside math, then the "(b)" after it,
   and so on. Anything out of that order is prose rather than a label and is passed
   over, which is what keeps a stray "(b)" inside a sentence from opening a part. */
type Found = { readonly label: PartLabel; readonly at: number; readonly end: number };
const runOf = (s: string): readonly Found[] => {
  const found: Found[] = [];
  let want = 'a';
  for (const m of s.matchAll(LABEL)) {
    const at = m.index ?? 0;
    if (m[1].toLowerCase() !== want || inMath(s, at)) continue;
    found.push({ label: `(${m[1]})`, at, end: at + m[0].length });
    want = nextLetter(want);
  }
  return found;
};

/* A string read as parts. Fewer than two parts is not a run, so it reads as prose. */
export const splitParts = (s: string): Parted => {
  const run = runOf(s);
  if (run.length < 2) return { lead: s.trim(), parts: [] };
  const parts = run.map((r, i) => ({ label: r.label, text: s.slice(r.end, run[i + 1]?.at ?? s.length).trim() }));
  return { lead: s.slice(0, run[0].at).trim(), parts };
};

/* A number as the answer column prints it: as the book would write it, which for a
   number far from one is a power of ten rather than a run of digits or the exponent
   JavaScript happens to print. The maths is left in $…$ for KaTeX to set. */
const trimZeros = (s: string): string => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);
export const numberText = (v: number): string => {
  if (v === 0 || !Number.isFinite(v)) return String(v);
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= 5 || e <= -3) return `$${trimZeros((v / 10 ** e).toPrecision(6))}\\times 10^{${e}}$`;
  return trimZeros(Number(v.toPrecision(12)).toString());
};

/* The number the key holds for a part. A `multi` answer keys one number per part; a
   `number` answer keys a single part of several. */
const keyedOf = (a: AnswerDTO, label: PartLabel): string => {
  const want = letterOf(label);
  if (a.type === 'multi') {
    const p = a.parts.find((q) => letterOf(q.part) === want);
    return p ? `${numberText(p.value)} ${p.unit}`.trim() : '';
  }
  if (a.type === 'number' && a.part && letterOf(a.part) === want) return `${numberText(a.value)} ${a.unit}`.trim();
  return '';
};

/* A part the book answers with a number and nothing else. Its row has no working to
   set down, so the number moves to the answer column and the question's own words for
   that part come across to stand where the working would have been. A long question
   would swamp the row, and a question carrying markup of its own — a table, a list —
   is left where the book set it rather than cut across one. */
const TERSE = 56;
const ASK = 90;
const askOf = (asks: ReadonlyMap<string, string>, label: PartLabel): string => {
  const ask = asks.get(letterOf(label)) ?? '';
  return ask.length > ASK || ask.includes('<') ? '' : ask;
};

/* The card's solution laid out as a row per part. No run of labels in the solution
   means no rows, and the card prints the solution as it always has. */
export const solutionParts = (sol: string, prompt: string, a: AnswerDTO): SolutionParts => {
  const { lead, parts } = splitParts(sol);
  if (parts.length === 0) return { lead: '', rows: [] };
  const asks = new Map(splitParts(prompt).parts.map((p) => [letterOf(p.label), p.text] as const));
  const rows = parts.map((p): PartRow => {
    const terse = p.text.length <= TERSE;
    return {
      label: p.label,
      ask: terse ? askOf(asks, p.label) : '',
      text: terse ? '' : p.text,
      value: keyedOf(a, p.label) || (terse ? p.text : ''),
    };
  });
  return { lead, rows };
};
