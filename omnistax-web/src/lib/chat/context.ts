/* What the model is told about what the reader is looking at. Nothing is sent
   because a tab happens to be open: everything the model sees stands as a chip
   above the composer, and a chip is only there because the reader put it there
   or left the pinned one alone. A chip carries its own words, so the request
   is built without reaching back into any store — which is what makes
   `requestOf` pure and testable. */

export const CHIP_KINDS = ['section', 'note', 'drawing', 'file', 'figure', 'concept', 'equation', 'definition', 'exercise', 'message', 'selection'] as const;
export type ChipKind = (typeof CHIP_KINDS)[number];

/* `key` is what the chip stands for, in the wiki-link grammar where there is
   one (`16.4`, `note:a1b2c3d4`), so the same thing is never added twice. */
export type Chip = {
  readonly kind: ChipKind;
  readonly key: string;
  readonly label: string;   /* what the chip reads: "16.4 · The Simple Pendulum" */
  readonly text: string;    /* what the model sees */
  readonly pinned?: boolean;   /* the section the chat was opened beside, which the reader may still remove */
};

export const chip = (kind: ChipKind, key: string, label: string, text: string, pinned = false): Chip =>
  ({ kind, key, label, text, ...(pinned ? { pinned } : {}) });

export const sameChip = (a: Chip, b: Chip): boolean => a.kind === b.kind && a.key === b.key;
export const withChip = (chips: readonly Chip[], c: Chip): readonly Chip[] =>
  chips.some((x) => sameChip(x, c)) ? chips : [...chips, c];
export const withoutChip = (chips: readonly Chip[], c: Chip): readonly Chip[] => chips.filter((x) => !sameChip(x, c));

/* The heading a chip wears in the request, so the model can tell a section of
   the book from a note the reader wrote about it. */
const HEADING: Readonly<Record<ChipKind, string>> = {
  section: 'Section of the textbook', note: 'A note the reader wrote', drawing: 'A drawing the reader made',
  file: 'A file the reader imported', figure: 'A figure of the textbook', concept: 'A concept of the textbook',
  equation: 'An equation of the textbook', definition: 'A definition of the textbook', exercise: 'An exercise of the textbook',
  message: 'An earlier chat message', selection: 'What the reader selected on the page',
};

/* The chips of one message, as the block that goes before its words. Chips
   with no text of their own are left out rather than sent as a bare name. */
export const contextBlock = (chips: readonly Chip[]): string =>
  chips.filter((c) => c.text.trim() !== '')
    .map((c) => `## ${HEADING[c.kind]}: ${c.label}\n\n${c.text.trim()}`)
    .join('\n\n');

/* A reader message as the provider is given it: the chips first, under one
   heading that says what they are, and then what the reader typed. */
export const askText = (text: string, chips: readonly Chip[]): string => {
  const block = contextBlock(chips);
  return block === '' ? text : `# What I am looking at\n\n${block}\n\n# My question\n\n${text}`;
};
