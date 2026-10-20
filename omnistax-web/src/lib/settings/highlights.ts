/* What a book highlights, beneath the reader's master switches. Three layers
   decide whether a page shows a way of colouring or the dotted rule: the
   global switches in the settings (All, the three families, Words, Symbols,
   Underlines), which stay masters; the book's own default, declared in its
   book.json because a calculus text has no use for coloured words where a
   physics text does; and the reader's choice for that book, which holds only
   the keys they changed, so a later change of the book's default reaches every
   key they never touched. A key shows on the page only when its global switch
   and the book's value are both on. Pure: the store reads and writes, and the
   shell turns what this answers into classes on the root. */
import { type ColourSwitch, type ColourSwitches, type ColourShown, COLOUR_LABELS, rootClasses, shownOf } from '../colours/switches';

export type HighlightKey = 'facts' | 'refs' | 'concepts' | 'words' | 'symbols' | 'underlines';
export type BookHighlights = Readonly<Record<HighlightKey, boolean>>;
/* The reader's choices for one book: only the keys they set apart from its default. */
export type HighlightOverrides = Readonly<Partial<Record<HighlightKey, boolean>>>;

export const HIGHLIGHT_KEYS: readonly HighlightKey[] = ['facts', 'refs', 'concepts', 'words', 'symbols', 'underlines'];
/* The book layer where there is no book (the about page): nothing held back. */
export const HIGHLIGHTS_ON: BookHighlights = { facts: true, refs: true, concepts: true, words: true, symbols: true, underlines: true };
export const HIGHLIGHT_LABELS: Readonly<Record<HighlightKey, string>> = { facts: COLOUR_LABELS.facts, refs: COLOUR_LABELS.refs, concepts: COLOUR_LABELS.concepts, words: COLOUR_LABELS.words, symbols: COLOUR_LABELS.symbols, underlines: 'Underlines' };
/* The book key a key sits under, as Words and Symbols sit under Concepts globally. */
export const HIGHLIGHT_PARENT: Readonly<Partial<Record<HighlightKey, HighlightKey>>> = { words: 'concepts', symbols: 'concepts' };
/* The global switches a key needs on, outermost first, by the name the dialog gives them. */
const MASTERS: Readonly<Record<HighlightKey, readonly (ColourSwitch | 'underlines')[]>> = {
  facts: ['all', 'facts'], refs: ['all', 'refs'], concepts: ['all', 'concepts'], words: ['all', 'concepts', 'words'], symbols: ['all', 'concepts', 'symbols'], underlines: ['underlines'],
};
/* The masters as the settings hold them. */
export type GlobalHighlights = { readonly colours: ColourSwitches; readonly underlines: boolean };

const isKey = (k: string): k is HighlightKey => (HIGHLIGHT_KEYS as readonly string[]).includes(k);

/* The book layer: the reader's choice where they made one, else the book's default. */
export const bookLayer = (defaults: BookHighlights, overrides: HighlightOverrides): BookHighlights =>
  Object.fromEntries(HIGHLIGHT_KEYS.map((k) => [k, overrides[k] ?? defaults[k]])) as Record<HighlightKey, boolean>;
/* The reader sets one key. Setting it back to the book's default clears the
   choice, so the key follows the book again. */
export const withChoice = (defaults: BookHighlights, overrides: HighlightOverrides, k: HighlightKey, on: boolean): HighlightOverrides => {
  const rest: Partial<Record<HighlightKey, boolean>> = { ...overrides }; delete rest[k];
  return on === defaults[k] ? rest : { ...rest, [k]: on };
};
/* What was stored, read past anything that is not a known key with a boolean. */
export const parseOverrides = (raw: unknown): HighlightOverrides =>
  raw && typeof raw === 'object' && !Array.isArray(raw)
    ? Object.fromEntries(Object.entries(raw).filter(([k, v]) => isKey(k) && typeof v === 'boolean'))
    : {};

/* The switches the page is drawn by: each global switch and-ed with the
   book's value. All has no book key, so it passes as it is. The figures and
   the stylesheets then read these exactly as they read the global ones. */
export const effectiveSwitches = (colours: ColourSwitches, book: BookHighlights): ColourSwitches => ({
  all: colours.all, facts: colours.facts && book.facts, refs: colours.refs && book.refs, concepts: colours.concepts && book.concepts, words: colours.words && book.words, symbols: colours.symbols && book.symbols,
});
/* What the page shows: the families the figures read, and whether the rule is drawn. */
export type PageHighlights = { readonly switches: ColourSwitches; readonly shown: ColourShown; readonly underlines: boolean };
export const pageHighlights = (g: GlobalHighlights, book: BookHighlights): PageHighlights => {
  const switches = effectiveSwitches(g.colours, book);
  return { switches, shown: shownOf(switches), underlines: g.underlines && book.underlines };
};
/* The classes the root wears for it: the cc-* of rootClasses, and no-underlines. */
export const highlightClasses = (g: GlobalHighlights, book: BookHighlights): Readonly<Record<string, boolean>> => {
  const p = pageHighlights(g, book);
  return { ...rootClasses(p.switches), 'no-underlines': !p.underlines };
};

/* Why a book key can do nothing just now: the global switch, or the book's own
   parent, that holds it off, said as the dialog says it; null when it is free. */
export const heldOffBy = (g: GlobalHighlights, book: BookHighlights, k: HighlightKey): string | null => {
  const off = MASTERS[k].find((m) => (m === 'underlines' ? !g.underlines : !g.colours[m]));
  if (off) return off === 'underlines' ? 'Underlines is off for every book.' : `${COLOUR_LABELS[off]} is off in Color coding, for every book.`;
  const parent = HIGHLIGHT_PARENT[k];
  return parent && !book[parent] ? `${HIGHLIGHT_LABELS[parent]} is off for this book.` : null;
};
