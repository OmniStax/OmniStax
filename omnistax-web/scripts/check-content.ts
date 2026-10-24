/* `npm run check:content`: read every book the build reads and follow every
   reference in each. The rules live in src/lib/content/check.ts, where they are
   pure and the tests call them; this file is only the command — where the
   content is, how the findings are printed, and what the shell is told. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseBooks, parseConfig } from '../omnistax.config';
import type { BookSelection, OmniStaxConfig } from '../omnistax.config';
import { findBooks, loadBooks, withInheritedTypes } from '../src/lib/content/load';
import { type ContentRoot, bookId, contentRoot } from '../src/lib/types/ids';
import { CHECKS, checkContent, checkParity, contentOf, errorsOf, warningsOf } from '../src/lib/content/check';
import type { Content, Finding } from '../src/lib/content/check';
import { defaultColours, isFreshDefault } from '../src/lib/colours/defaults';
import type { BookTree } from '../src/lib/content/load';
import { unmarkedRedefinitions } from '../src/lib/hover/data';

/* The command's own layer over the build's configuration: the content root and
   which books of it to read, either of which may be named on the line. */
type CheckArgs = { readonly root: ContentRoot; readonly books: BookSelection };
export const parseArgs = (argv: readonly string[], base: OmniStaxConfig): CheckArgs => {
  const value = (flag: string): string | undefined => { const i = argv.indexOf(flag); return i < 0 ? undefined : argv[i + 1]; };
  const root = value('--root');
  const named = value('--books') ?? value('--book');
  return { root: root === undefined ? base.content.root : contentRoot(path.resolve(root)), books: named === undefined ? base.content.books : parseBooks(named) };
};

/* ---------- printing ---------- */

const GROUPS = [
  { level: 'error' as const, head: (n: number) => `${n} error${n === 1 ? '' : 's'}` },
  { level: 'warning' as const, head: (n: number) => `${n} warning${n === 1 ? '' : 's'}` },
  { level: 'info' as const, head: (n: number) => `${n} note${n === 1 ? '' : 's'}` },
];
const width = (findings: readonly Finding[]): number => findings.reduce((w, f) => Math.max(w, f.where.length), 0);
const line = (f: Finding, pad: number): string => `  ${f.where.padEnd(pad)}  ${f.what}`;

const report = (findings: readonly Finding[], content: Content): string => {
  const sections = content.chapters.flatMap((ch) => ch.sections).length;
  const front = [content.intro, content.summary, ...content.chapters.flatMap((ch) => [ch.intro, ch.summary])].filter((p) => p !== undefined).length;
  const groups = GROUPS.flatMap(({ level, head }) => {
    const own = findings.filter((f) => f.level === level);
    return own.length === 0 ? [] : [[head(own.length), ...own.map((f) => line(f, width(own)))].join('\n')];
  });
  const warnings = warningsOf(findings).length;
  const tally = `${content.chapters.length} chapters, ${sections} sections${front === 0 ? '' : `, ${front} introduction or summary page${front === 1 ? '' : 's'}`}, ${CHECKS.length} checks, ${errorsOf(findings).length === 0 ? 'no errors' : `${errorsOf(findings).length} errors`}${warnings === 0 ? '' : `, ${warnings} warning${warnings === 1 ? '' : 's'}`}`;
  return [...groups, tally].join('\n\n');
};

/* A symbol given two meanings in one chapter, where the later row does not say
   `redefines`: a warning only, since the heuristic behind it can be wrong. */
export const redefinitions = (content: Content): readonly Finding[] =>
  withInheritedTypes(content.book, content.chapters.map((ch) => ch.dto)).chapters.flatMap((ch) => unmarkedRedefinitions(ch.variables).map(([a, b]): Finding => ({
    level: 'warning', where: `${ch.dir}/chapter.json variables[${b.section}/${b.sym}]`,
    what: `means something else in ${a.section} ("${a.meaning}"); reuse that meaning, or reword this one to stand alone and set "redefines": true`,
  })));

/* The stored default colours (book.json `colours`) against what the script would write today: pages built
   since move the smart assignment, so a stale default is not what the Theme page's Apply smart gives. */
export const staleDefault = (book: BookTree): readonly Finding[] =>
  (book.dto.colours && !isFreshDefault(book.dto.colours, defaultColours(book.dto.types.map((t) => String(t.id)), book.manifest))
    ? [{ level: 'warning', where: 'book.json colours', what: 'is stale: the smart assignment has moved since it was written; run npm run colours:default' }] : []);

/* ---------- the command ---------- */

/* One book's heading and report, with a blank line between books so that a run over several reads as several. */
const bookReport = (content: Content, findings: readonly Finding[]): string => `${content.book.title} (${content.book.id})\n\n${report(findings, content)}`;

/* A translation against its source, which is read even where the run does not
   name it, and its glossary looked for on disk, since only the command reads the
   disk. A translation_of that names no book has already stopped the load. */
const translationFindings = async (root: ContentRoot, content: Content, loaded: readonly Content[]): Promise<readonly Finding[]> => {
  const of = content.book.translationOf;
  if (of === undefined || of === content.book.id) return [];
  const folders = await findBooks(root);
  const source = loaded.find((c) => c.book.id === of) ?? await contentOf((await loadBooks(root, { kind: 'named', ids: [bookId(of)] }))[0]);
  const own = folders.find((f) => f.id === content.book.id);
  const glossary = content.book.translation?.glossary;
  const missing = own && glossary !== undefined && !(await fs.access(path.join(own.dir, glossary)).then(() => true, () => false));
  return [
    ...checkParity(content, source),
    ...(missing ? [{ level: 'warning' as const, where: 'book.json translation.glossary', what: `names ${glossary}, which is not in the book's folder` }] : []),
  ];
};

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2), parseConfig(process.env));
  const books = await loadBooks(args.root, args.books);
  const contents = await Promise.all(books.map(contentOf));
  const checked = await Promise.all(books.map(async (book, i) => {
    const content = contents[i];
    return { content, findings: [...checkContent(content), ...redefinitions(content), ...(book.dto.translationOf === undefined ? staleDefault(book) : []), ...await translationFindings(args.root, content, contents)] };
  }));
  console.log(checked.map((c) => bookReport(c.content, c.findings)).join('\n\n'));
  return checked.every((c) => errorsOf(c.findings).length === 0) ? 0 : 1;
};

process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1; });
