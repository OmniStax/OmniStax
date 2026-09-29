/* The tools the model reads the books through. Each runs in the browser
   against a `Library` port, so the answers are worked out here without a
   registry and a test passes a fake. Every answer is plain text with the
   links the model may write back. */
import { search } from '../search/index';
import type { Corpus, Filter, Hit } from '../search/model';
import type { ToolSpec } from './providers/index';
import type { ToolStep } from './model';

export type BookSummary = { readonly id: string; readonly title: string };
export type TocSection = { readonly id: string; readonly title: string; readonly built: boolean };
export type TocChapter = { readonly id: string; readonly title: string; readonly sections: readonly TocSection[] };
export type FigureParam = { readonly label: string; readonly value: unknown; readonly unit?: string };
export type FigureFacts = { readonly caption: string; readonly alt: string; readonly params: readonly FigureParam[]; readonly source?: string };

export type Library = {
  books(): Promise<readonly BookSummary[]>;
  chapters(book: string): Promise<readonly TocChapter[] | null>;
  section(book: string, section: string): Promise<{ readonly title: string; readonly text: string } | null>;
  corpus(book: string): Promise<Corpus | null>;
  figure(book: string, section: string, id: string, source: boolean): Promise<FigureFacts | null>;
};

const str = { type: 'string' } as const;
const obj = (properties: Record<string, unknown>, required: readonly string[]): Record<string, unknown> => ({ type: 'object', properties, required });

export const TOOL_SPECS: readonly ToolSpec[] = [
  { name: 'list_books', description: 'List the OmniBooks on the reader\'s shelf: ids and titles.', parameters: obj({}, []) },
  { name: 'table_of_contents', description: 'Chapters and sections of a book, or of one chapter.', parameters: obj({ book: str, chapter: { ...str, description: 'chapter number, e.g. "16"' } }, ['book']) },
  { name: 'read_section', description: 'The text of one section; figures appear as their captions.', parameters: obj({ book: str, section: { ...str, description: 'section number, e.g. "16.4"' } }, ['book', 'section']) },
  { name: 'search', description: 'Full-text search of a book: hits with section and snippet.', parameters: obj({ book: str, query: str }, ['book', 'query']) },
  { name: 'lookup', description: 'Find definitions, equations, symbols or concepts of a book, with their links.', parameters: obj({ book: str, kind: { type: 'string', enum: ['definition', 'equation', 'symbol', 'concept'] }, query: str }, ['book', 'kind', 'query']) },
  { name: 'figure', description: 'A figure of a section: caption, alt text, parameters with their current values, and its source code when asked.', parameters: obj({ book: str, section: str, id: { ...str, description: 'figure id, e.g. "sim-pendulum"' }, include_source: { type: 'boolean' } }, ['book', 'section', 'id']) },
];

export const MAX_ROUNDS = 8;
const HIT_CAP = 12;
const TEXT_CAP = 24_000;

type Input = Readonly<Record<string, unknown>>;
const field = (input: Input, k: string): string => (typeof input[k] === 'string' ? (input[k] as string).trim() : '');
const cap = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n)}\n…(cut at ${n} characters)` : s);

class ToolError extends Error {}
const need = <T>(v: T | null | undefined, why: string): T => { if (v === null || v === undefined) throw new ToolError(why); return v; };

const listBooks = async (lib: Library): Promise<string> =>
  (await lib.books()).map((b) => `${b.id} — ${b.title}`).join('\n') || 'No books on the shelf.';

const toc = async (lib: Library, input: Input): Promise<string> => {
  const book = field(input, 'book');
  const chapters = need(await lib.chapters(book), `No book called ${book}.`);
  const wanted = field(input, 'chapter');
  const shown = wanted ? chapters.filter((c) => c.id === wanted || c.title.startsWith(`${wanted} `)) : chapters;
  need(shown.length ? shown : null, `${book} has no chapter ${wanted}.`);
  return shown.map((c) => [`${c.title}`, ...c.sections.map((s) => `  [[${book}/${s.id}]] ${s.title}${s.built ? '' : ' (not built)'}`)].join('\n')).join('\n');
};

const readSection = async (lib: Library, input: Input): Promise<string> => {
  const book = field(input, 'book'); const sec = field(input, 'section');
  const s = need(await lib.section(book, sec), `${book} has no built section ${sec}.`);
  return `# ${sec} ${s.title}\n[[${book}/${sec}]]\n\n${cap(s.text, TEXT_CAP)}`;
};

const flat = (s: string): string => s.replace(/\s+/g, ' ').trim();

/* A hit as the model reads it, with the link it may write. */
export const hitLine = (h: Hit): string => {
  switch (h.kind) {
    case 'concept': return `[[concept:${h.book}/${h.concept.section}:${h.concept.id}]] ${h.concept.name}`;
    case 'formula': return `![[eq:${h.book}/${h.equation.section}:${h.equation.id}]] $${h.equation.latex}$${h.equation.condition ? ` (${h.equation.condition})` : ''}`;
    case 'definition': return h.def.kind === 'term'
      ? `[[def:${h.book}/${h.def.term.section}:${h.def.term.term}]] ${flat(h.def.term.definition)}`
      : `[[sym:${h.book}/${h.def.symbol.section}:${h.def.symbol.sym}]] ${h.def.symbol.sym}: ${h.def.symbol.meaning}${h.def.symbol.unit ? ` (${h.def.symbol.unit})` : ''}`;
    case 'text': return `[[${h.book}/${h.page.id}]] ${h.page.title}${h.head ? ` · ${h.head}` : ''}: ${flat(h.excerpt.map((p) => p.t).join(''))}`;
  }
};

const find = async (lib: Library, book: string, query: string, filter: Filter, keep: (h: Hit) => boolean = () => true): Promise<string> => {
  const corpus = need(await lib.corpus(book), `No book called ${book}.`);
  const hits = search(query, [corpus], filter).hits.filter(keep).slice(0, HIT_CAP);
  return hits.map(hitLine).join('\n') || `Nothing in ${book} matches "${query}".`;
};

const LOOKUP: Readonly<Record<string, { readonly filter: Filter; readonly keep?: (h: Hit) => boolean }>> = {
  definition: { filter: 'definition', keep: (h) => h.kind === 'definition' && h.def.kind === 'term' },
  symbol: { filter: 'definition', keep: (h) => h.kind === 'definition' && h.def.kind === 'symbol' },
  equation: { filter: 'formula' },
  concept: { filter: 'concept' },
};

const lookup = (lib: Library, input: Input): Promise<string> => {
  const how = need(LOOKUP[field(input, 'kind')], 'kind is one of definition, equation, symbol, concept.');
  return find(lib, field(input, 'book'), field(input, 'query'), how.filter, how.keep);
};

export const paramLines = (params: readonly FigureParam[]): string =>
  params.length ? `Parameters now:\n${params.map((p) => `- ${p.label}: ${String(p.value)}${p.unit ? ` ${p.unit}` : ''}`).join('\n')}` : '';

const figure = async (lib: Library, input: Input): Promise<string> => {
  const book = field(input, 'book'); const sec = field(input, 'section'); const id = field(input, 'id');
  const f = need(await lib.figure(book, sec, id, input.include_source === true), `${book} ${sec} has no figure ${id}.`);
  return [
    `![[fig:${book}/${sec}:${id}]]`,
    f.caption && `Caption: ${f.caption}`,
    f.alt && `Alt text: ${f.alt}`,
    paramLines(f.params),
    f.source ? `Source:\n\`\`\`js\n${cap(f.source, TEXT_CAP)}\n\`\`\`` : '',
  ].filter(Boolean).join('\n\n');
};

/* One call run: its output, or the reason it could not be answered, which
   the model is shown so it can try again. */
export const runTool = async (lib: Library, name: string, input: unknown): Promise<{ readonly output?: string; readonly error?: string }> => {
  const args = (typeof input === 'object' && input !== null ? input : {}) as Input;
  try {
    switch (name) {
      case 'list_books': return { output: await listBooks(lib) };
      case 'table_of_contents': return { output: await toc(lib, args) };
      case 'read_section': return { output: await readSection(lib, args) };
      case 'search': return { output: await find(lib, field(args, 'book'), field(args, 'query'), 'all') };
      case 'lookup': return { output: await lookup(lib, args) };
      case 'figure': return { output: await figure(lib, args) };
      default: return { error: `There is no tool called ${name}.` };
    }
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
};

/* The line a bubble shows for a step: "Read 16.4 Simple Harmonic Motion". */
export const stepLabel = (s: ToolStep): string => {
  const i = (typeof s.input === 'object' && s.input !== null ? s.input : {}) as Input;
  switch (s.name) {
    case 'list_books': return 'Listed the books';
    case 'table_of_contents': return `Contents of ${field(i, 'book')}${field(i, 'chapter') ? `, chapter ${field(i, 'chapter')}` : ''}`;
    case 'read_section': return `Read ${s.output?.match(/^# (.+)$/m)?.[1] ?? field(i, 'section')}`;
    case 'search': return `Searched “${field(i, 'query')}”`;
    case 'lookup': return `Looked up ${field(i, 'kind') || 'the book'} “${field(i, 'query')}”`;
    case 'figure': return `Figure ${field(i, 'section')} ${field(i, 'id')}`;
    default: return s.name;
  }
};

/* The part of a section's figures.js that draws one figure: the top-level
   block naming its id, and the helpers above the first figure, which every
   figure of the section shares. A file whose id cannot be found is sent whole. */
export const figureSource = (js: string, id: string): string => {
  const lines = js.split('\n');
  const starts = lines.flatMap((l, i) => (/^\S/.test(l) && !/^[})\]]/.test(l) ? [i] : []));
  const blocks = starts.map((s, k) => lines.slice(s, starts[k + 1] ?? lines.length).join('\n'));
  const at = blocks.findIndex((b) => b.includes(`'${id}'`) || b.includes(`"${id}"`));
  if (at < 0) return js;
  const firstFigure = blocks.findIndex((b) => /\bsim\(\s*['"]|figure\(\s*['"]/.test(b));
  const shared = firstFigure > 0 ? blocks.slice(0, firstFigure) : [];
  return [...shared, blocks[at]].join('\n');
};
