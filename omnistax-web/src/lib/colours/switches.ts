/* A book's colour switches: one for each way colour reaches a page (RULES item 7).
   Words and phrases and Symbols sit under Concepts and reach the page's text only:
   off, the words that name a concept, or the symbols in its equations and readouts,
   read in ink while figures and slider thumbs follow Concepts itself. */
export type ColourFamily = 'facts' | 'refs' | 'concepts';
export type ColourSwitch = ColourFamily | 'words' | 'symbols';
export type ColourSwitches = Readonly<Record<ColourSwitch, boolean>>;
export type ColourShown = Readonly<Record<ColourFamily, boolean>>;

export const COLOUR_FAMILIES: readonly ColourFamily[] = ['facts', 'refs', 'concepts'];
export const COLOUR_SWITCHES: readonly ColourSwitch[] = [...COLOUR_FAMILIES, 'words', 'symbols'];
export const COLOUR_LABELS: Readonly<Record<ColourSwitch, string>> = { facts: 'Facts and conventions', refs: 'Referents', concepts: 'Concepts', words: 'Words and phrases', symbols: 'Symbols' };
export const COLOUR_TIPS: Readonly<Partial<Record<ColourSwitch, string>>> = { words: 'Color the words that name a concept.', symbols: 'Color the symbols in equations and readouts.' };
/* The switch a sub-switch sits under, which must be on for it to do anything. */
export const COLOUR_PARENT: Readonly<Partial<Record<ColourSwitch, ColourSwitch>>> = { words: 'concepts', symbols: 'concepts' };
export const COLOURS_ON: ColourSwitches = { facts: true, refs: true, concepts: true, words: false, symbols: true };

export const shownOf = (s: ColourSwitches): ColourShown => ({ facts: s.facts, refs: s.refs, concepts: s.concepts });

/* The class the root element wears while a switch is on, or a family shows: the
   stylesheets and the figure library read the families, never the switches. */
export const colourClass = (k: ColourSwitch): string => `cc-${k}`;
export const rootClasses = (s: ColourSwitches): Readonly<Record<string, boolean>> =>
  Object.fromEntries([
    ...COLOUR_FAMILIES.map((f) => [colourClass(f), s[f]] as const), [colourClass('words'), s.concepts && s.words], [colourClass('symbols'), s.concepts && s.symbols],
  ]);
