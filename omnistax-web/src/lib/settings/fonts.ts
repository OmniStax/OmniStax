/* The six faces a reader may set the figures and the prose in. Each id names a
   family bundled under /fonts and a CSS stack that falls back gracefully. */
export type FontId = 'ncm' | 'cmu' | 'lmr' | 'sourceSerif' | 'sourceSans' | 'libertinus';
export type FontStack = string;
type Font = { id: FontId; label: string; stack: FontStack };

const SERIF_FALLBACK = "Georgia,'Times New Roman',serif";
const SANS_FALLBACK = "'Segoe UI',Helvetica,Arial,sans-serif";

const TABLE: readonly Font[] = [
  { id: 'ncm', label: 'New Computer Modern Book', stack: `'New Computer Modern Book',${SERIF_FALLBACK}` },
  { id: 'cmu', label: 'CMU Serif', stack: `'CMU Serif',${SERIF_FALLBACK}` },
  { id: 'lmr', label: 'Latin Modern Roman', stack: `'Latin Modern Roman',${SERIF_FALLBACK}` },
  { id: 'sourceSerif', label: 'Source Serif 4', stack: `'Source Serif 4',${SERIF_FALLBACK}` },
  { id: 'sourceSans', label: 'Source Sans 3', stack: `'Source Sans 3',${SANS_FALLBACK}` },
  { id: 'libertinus', label: 'Libertinus Serif', stack: `'Libertinus Serif',${SERIF_FALLBACK}` },
];

export const FONTS: readonly { id: FontId; label: string }[] = TABLE.map(({ id, label }) => ({ id, label }));
export const DEFAULT_FIGURE_FONT: FontId = 'ncm';
export const DEFAULT_BODY_FONT: FontId = 'sourceSerif';

export const isFontId = (s: unknown): s is FontId => TABLE.some((f) => f.id === s);
export const fontStack = (id: FontId): FontStack => (TABLE.find((f) => f.id === id) ?? TABLE[0]).stack;
export const fontFamily = (id: FontId): string => (TABLE.find((f) => f.id === id) ?? TABLE[0]).label;
export const parseFont = (s: string | null, fallback: FontId): FontId => (isFontId(s) ? s : fallback);
export const effective = <T>(preview: T | undefined, saved: T): T => preview ?? saved;

/* The weights the page draws each role in: prose and captions in regular, italic
   and bold; figures also in the 600 labels are measured in. */
const LOADS: Record<'figure' | 'body', readonly string[]> = { figure: ['400', '600', '700', 'italic 400'], body: ['400', '700', 'italic 400'] };
export const loadSpecs = (role: 'figure' | 'body', id: FontId): string[] => LOADS[role].map((w) => `${w} 16px '${fontFamily(id)}'`);

/* Sets `--figure` and `--body` on the root, then waits for both faces so the
   caller can redraw what it measured in a fallback. */
export const applyFonts = async (figure: FontId, body: FontId, root: HTMLElement = document.documentElement): Promise<void> => {
  root.style.setProperty('--figure', fontStack(figure));
  root.style.setProperty('--body', fontStack(body));
  const specs = [...loadSpecs('figure', figure), ...loadSpecs('body', body)];
  await Promise.all(specs.map((f) => document.fonts.load(f, 'Aa1 ΩΔθμπ').catch(() => [])));
};
