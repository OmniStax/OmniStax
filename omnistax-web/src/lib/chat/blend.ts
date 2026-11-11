/* The books an answer's maths may be written in besides the one it reads in.
   An answer's maths is set under the book of the last chip before it, but the
   model reads other books through its tools and quotes their symbols in their
   own macros; set under the chip's book alone, a macro only another book
   defines comes out as its source. So the table an answer falls back on is a
   blend: its own book first, then every book the conversation has named on
   the way to it, nearest first. Maths in a paragraph that links into a book
   is still that book's alone. */
import { parseLink } from '../notes/md/links';
import { placeOfChip } from './entries';
import { messageOf, type Chat, type Message, type MessageId } from './model';

const BOOK_ID = /^[a-z0-9][a-z0-9-]*$/;
const LINK = /\[\[([^\]\n]+)\]\]/g;

/* The books one message names, in the order it names them: the books of its
   chips, the books its tools were asked about, and the books its links go
   into. Kept by the message, which is a new value whenever it changes. */
const named = new WeakMap<Message, readonly string[]>();
export const booksNamed = (m: Message): readonly string[] => {
  const had = named.get(m); if (had) return had;
  const out: string[] = [];
  const add = (b: unknown): void => { if (typeof b === 'string' && BOOK_ID.test(b) && !out.includes(b)) out.push(b); };
  m.chips.forEach((c) => add(placeOfChip(c)?.book));
  (m.steps ?? []).forEach((s) => { if (s.kind === 'tool' && typeof s.input === 'object' && s.input !== null) add((s.input as { readonly book?: unknown }).book); });
  for (const l of m.text.matchAll(LINK)) { const t = parseLink(l[1]!); if ('section' in t) add(t.book); }
  named.set(m, out);
  return out;
};

/* The books named on the way to a message: its own, then its parent's, and so
   on up to the first thing said. */
export const booksAround = (chat: Chat, id: MessageId): readonly string[] => {
  const out: string[] = [], seen = new Set<string>();
  for (let at: MessageId | null = id; at !== null && !seen.has(at);) {
    seen.add(at);
    const m = messageOf(chat, at); if (!m) break;
    booksNamed(m).forEach((b) => { if (!out.includes(b)) out.push(b); });
    at = m.parent;
  }
  return out;
};

/* Several books' macros as one table, the first book to name a macro keeping
   it. The same tables in the same order give the same object back, since what
   KaTeX has already set is kept by the table it was set under. */
type Macros = Readonly<Record<string, string>>;
type Kept = { readonly parts: readonly Macros[]; readonly all: Macros };
const blends: Kept[] = [];
export const blendMacros = (parts: readonly Macros[]): Macros => {
  if (parts.length === 1) return parts[0]!;
  const had = blends.find((k) => k.parts.length === parts.length && k.parts.every((p, i) => p === parts[i]));
  if (had) return had.all;
  const all: Record<string, string> = {};
  parts.forEach((p) => Object.entries(p).forEach(([k, v]) => { if (!(k in all)) all[k] = v; }));
  if (blends.length >= 64) blends.shift();
  blends.push({ parts: [...parts], all });
  return all;
};
