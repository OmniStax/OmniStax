/* The reader's colour switches: one for each way colour reaches a page (RULES item 7)
   and All over them. All off sets every family in ink; on, each family follows its
   own switch again, which All never changes. Concept words sits under Concepts: off,
   the words that name a concept read in ink while symbols, sliders and figures keep
   their colours. */
export type ColourFamily = 'facts' | 'refs' | 'concepts';
export type ColourSwitch = 'all' | ColourFamily | 'words';
export type ColourSwitches = Readonly<Record<ColourSwitch, boolean>>;
/* What each family shows once All has had its say. */
export type ColourShown = Readonly<Record<ColourFamily, boolean>>;

export const COLOUR_FAMILIES: readonly ColourFamily[] = ['facts', 'refs', 'concepts'];
export const COLOUR_SWITCHES: readonly ColourSwitch[] = ['all', ...COLOUR_FAMILIES, 'words'];
export const COLOUR_LABELS: Readonly<Record<ColourSwitch, string>> = { all: 'All', facts: 'Facts and conventions', refs: 'Referents', concepts: 'Concepts', words: 'Concept words' };
export const COLOUR_TIPS: Readonly<Partial<Record<ColourSwitch, string>>> = { words: 'Color the words that name a concept. Symbols and figures keep their colors either way.' };
/* The switch a sub-switch sits under, which must be on for it to do anything. */
export const COLOUR_PARENT: Readonly<Partial<Record<ColourSwitch, ColourSwitch>>> = { words: 'concepts' };
export const COLOURS_ON: ColourSwitches = { all: true, facts: true, refs: true, concepts: true, words: true };

export const shownOf = (s: ColourSwitches): ColourShown => ({ facts: s.all && s.facts, refs: s.all && s.refs, concepts: s.all && s.concepts });

/* The class the root element wears while a switch is on, or a family shows: the
   stylesheets and the figure library read the families, never the switches. */
export const colourClass = (k: ColourSwitch): string => `cc-${k}`;
export const rootClasses = (s: ColourSwitches): Readonly<Record<string, boolean>> => {
  const shown = shownOf(s);
  return Object.fromEntries([
    [colourClass('all'), s.all], ...COLOUR_FAMILIES.map((f) => [colourClass(f), shown[f]] as const), [colourClass('words'), shown.concepts && s.words],
  ]);
};
