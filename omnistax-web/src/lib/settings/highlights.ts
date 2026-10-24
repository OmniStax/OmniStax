/* What a book highlights. Two layers decide whether a page shows a way of
   colouring or the dotted rule: the book's own default, declared in its
   book.json because a calculus text has no use for coloured words where a
   physics text does; and the reader's choice for that book, which holds only
   the keys they changed, so a later change of the book's default reaches every
   key they never touched. Pure: the store reads and writes, and the shell turns
   what this answers into classes on the root. */
import { type ColourSwitches, type ColourShown, COLOUR_LABELS, rootClasses, shownOf } from '../colours/switches';
import { t } from '../i18n/index';

export type HighlightKey = 'facts' | 'refs' | 'concepts' | 'words' | 'symbols' | 'underlines';
export type BookHighlights = Readonly<Record<HighlightKey, boolean>>;
/* The reader's choices for one book: only the keys they set apart from its default. */
export type HighlightOverrides = Readonly<Partial<Record<HighlightKey, boolean>>>;

export const HIGHLIGHT_KEYS: readonly HighlightKey[] = ['facts', 'refs', 'concepts', 'words', 'symbols', 'underlines'];
/* The book layer where there is no book (the about page): nothing held back. */
export const HIGHLIGHTS_ON: BookHighlights = { facts: true, refs: true, concepts: true, words: false, symbols: true, underlines: true };
/* Read in the current language each time a label is asked for (getters, not stored strings). */
export const HIGHLIGHT_LABELS: Readonly<Record<HighlightKey, string>> = {
  get facts() { return COLOUR_LABELS.facts; }, get refs() { return COLOUR_LABELS.refs; }, get concepts() { return COLOUR_LABELS.concepts; },
  get words() { return COLOUR_LABELS.words; }, get symbols() { return COLOUR_LABELS.symbols; }, get underlines() { return t('settings.highlights.underlines'); },
};
/* The book key a key sits under, as Words and Symbols sit under Concepts globally. */
export const HIGHLIGHT_PARENT: Readonly<Partial<Record<HighlightKey, HighlightKey>>> = { words: 'concepts', symbols: 'concepts' };
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

/* The switches the page is drawn by, which the figures and the stylesheets read. */
export const switchesOf = (book: BookHighlights): ColourSwitches => ({ facts: book.facts, refs: book.refs, concepts: book.concepts, words: book.words, symbols: book.symbols });
/* What the page shows: the families the figures read, and whether the rule is drawn. */
export type PageHighlights = { readonly switches: ColourSwitches; readonly shown: ColourShown; readonly underlines: boolean };
export const pageHighlights = (book: BookHighlights): PageHighlights => {
  const switches = switchesOf(book);
  return { switches, shown: shownOf(switches), underlines: book.underlines };
};
/* The classes the root wears for it: the cc-* of rootClasses, and no-underlines. */
export const highlightClasses = (book: BookHighlights): Readonly<Record<string, boolean>> =>
  ({ ...rootClasses(switchesOf(book)), 'no-underlines': !book.underlines });

/* Why a book key can do nothing just now: the parent that holds it off; null when it is free. */
export const heldOffBy = (book: BookHighlights, k: HighlightKey): string | null => {
  const parent = HIGHLIGHT_PARENT[k];
  return parent && !book[parent] ? t('settings.highlights.heldOff', { name: HIGHLIGHT_LABELS[parent] }) : null;
};
