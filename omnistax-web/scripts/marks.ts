/* `npm run marks -- "<book>" [ch05 …] [--word time,work] [--tally]`: every word the
   build marks with its concept's type (src/lib/content/typewords.ts), one mention a
   line as `section · type · word · …context…`, for the author's sweep for words used
   in their everyday sense. The book is named by its title, id or folder; no chapter
   named means every chapter. `--word` keeps the mentions of those concept words (or
   of those words as the text writes them); `--tally` prints a count per word instead.
   It reads the files as the build does and marks them with the same function, so the
   list is what the page wears; authored spans are left out, being already decided. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseConfig } from '../omnistax.config';
import { findBooks, macrosOf } from '../src/lib/content/load';
import { BookSchema, ChapterSchema, SectionSchema } from '../src/lib/content/schema';
import type { BookDTO, SectionDTO } from '../src/lib/content/schema';
import { type Mark, type Piece, type WordIndex, piecesOf, wordIndex } from '../src/lib/content/typewords';
import { prerenderMath } from '../src/lib/math/prerender';
import type { BookDir, ContentRoot } from '../src/lib/types/ids';

type MarksArgs = { readonly book: string; readonly chapters: readonly string[]; readonly words: ReadonlySet<string> | null; readonly tally: boolean };
const parseArgs = (argv: readonly string[]): MarksArgs => {
  const flag = (name: string): string | undefined => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
  const words = flag('--word');
  const loose = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--word');
  return { book: loose[0] ?? '', chapters: loose.slice(1), words: words === undefined ? null : new Set(words.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean)), tally: argv.includes('--tally') };
};

/* One mention as the sweep prints it. */
type Mention = { readonly page: string; readonly type: string; readonly word: string; readonly phrase: string; readonly before: string; readonly after: string };

const unesc = (s: string): string => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const squash = (s: string): string => unesc(s).replace(/\s+/g, ' ');
const BLOCK = /^<\/?(p|div|li|td|th|tr|h\d|figcaption|figure|section|br|span class="eyebrow")\b/;
/* The text the reader reads, math left out, and each mark at its place in it. */
const readOf = (pieces: readonly Piece[]): { readonly text: string; readonly marks: readonly (Mark & { readonly at: number })[] } =>
  pieces.reduce<{ text: string; marks: (Mark & { at: number })[] }>((acc, p) => {
    if (!p.text) return BLOCK.test(p.html) ? { ...acc, text: `${acc.text} ` } : acc;
    if (!p.seen) return acc;
    return { text: acc.text + p.html, marks: [...acc.marks, ...p.marks.map((m) => ({ ...m, at: acc.text.length }))] };
  }, { text: '', marks: [] });

const SPAN = 70;
const mentionsOf = (index: WordIndex, page: string, html: string): readonly Mention[] => {
  const { text, marks } = readOf(piecesOf(index, html));
  return marks.map((m) => ({
    page, type: m.type, phrase: m.phrase, word: squash(text.slice(m.at + m.from, m.at + m.to)),
    before: squash(text.slice(Math.max(0, m.at + m.from - SPAN), m.at + m.from)).trimStart(),
    after: squash(text.slice(m.at + m.to, m.at + m.to + SPAN)).trimEnd(),
  }));
};

const readIf = (p: string): Promise<string> => fs.readFile(p, 'utf8').catch(() => '');
/* The prose of one page as the build marks it: the text, the lead, the summary and the exercises lead, math rendered. */
const pageMentions = async (index: WordIndex, book: BookDTO, dir: string, label: string): Promise<readonly Mention[]> => {
  const json = await readIf(path.join(dir, 'section.json'));
  if (json === '') return [];
  const s: SectionDTO = SectionSchema.parse(JSON.parse(json));
  const macros = macrosOf(book.symbols);
  const math = (h: string): string => (h ? prerenderMath(h, macros) : '');
  return [
    ...mentionsOf(index, `${label} lead`, math(s.lead)),
    ...mentionsOf(index, label, math(await readIf(path.join(dir, 'text.html')))),
    ...mentionsOf(index, `${label} summary`, math(s.summaryHtml)),
    ...mentionsOf(index, `${label} exercises`, math(s.exercisesLead)),
  ];
};
const chapterMentions = async (index: WordIndex, book: BookDTO, root: BookDir, chDir: string): Promise<readonly Mention[]> => {
  const ch = ChapterSchema.parse(JSON.parse(await fs.readFile(path.join(root, chDir, 'chapter.json'), 'utf8')));
  const pages = [{ id: 'intro', label: `${chDir} intro` }, ...ch.sections.map((s) => ({ id: s.id, label: s.id })), { id: 'summary', label: `${chDir} summary` }];
  return (await Promise.all(pages.map((p) => pageMentions(index, book, path.join(root, chDir, p.id), p.label)))).flat();
};

const findBook = async (root: ContentRoot, name: string): Promise<{ readonly dir: BookDir; readonly book: BookDTO }> => {
  const found = await Promise.all((await findBooks(root)).map(async (f) => ({ dir: f.dir, book: BookSchema.parse(JSON.parse(await fs.readFile(path.join(f.dir, 'book.json'), 'utf8'))) })));
  const want = name.toLowerCase();
  const hit = found.find((f) => [f.book.id, f.book.title, path.basename(f.dir)].some((n) => n.toLowerCase() === want));
  if (!hit) throw new Error(`no book "${name}" under ${root}; found ${found.map((f) => `"${f.book.title}" (${f.book.id})`).join(', ')}`);
  return hit;
};
const chapterDir = (dirs: readonly string[], name: string): string => {
  const hit = dirs.find((d) => d === name || d === `ch${name.padStart(2, '0')}`);
  if (!hit) throw new Error(`no chapter "${name}"; the book has ${dirs.join(', ')}`);
  return hit;
};

const tallyOf = (ms: readonly Mention[]): string =>
  [...ms.reduce((m, x) => m.set(`${x.phrase} · ${x.type}`, (m.get(`${x.phrase} · ${x.type}`) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => `${String(n).padStart(6)}  ${k}`).join('\n');

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));
  const { dir, book } = await findBook(parseConfig(process.env).content.root, args.book);
  const index = wordIndex(book.concepts);
  const dirs = args.chapters.length ? args.chapters.map((c) => chapterDir(book.chapterDirs, c)) : book.chapterDirs;
  const all = (await Promise.all(dirs.map((d) => chapterMentions(index, book, dir, d)))).flat();
  const kept = args.words === null ? all : all.filter((m) => args.words?.has(m.phrase) || args.words?.has(m.word.toLowerCase()));
  console.log(args.tally ? tallyOf(kept) : kept.map((m) => `${m.page} · ${m.type} · ${m.word} · …${m.before}[${m.word}]${m.after}…`).join('\n'));
  console.error(`${kept.length} mentions${index.conflicts.length ? `; words two types share: ${index.conflicts.map((c) => `"${c.word}" → ${c.chosen} (${c.concepts.map((x) => `${x.id}: ${x.type}`).join(', ')})`).join('; ')}` : ''}`);
  return 0;
};

process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1; });
