/* `npm run check:content`: read the book the build reads and follow every
   reference in it. The rules live in src/lib/content/check.ts, where they are
   pure and the tests call them; this file is only the command — where the
   content is, how the findings are printed, and what the shell is told. */
import { parseConfig } from '../omnistax.config';
import type { OmniStaxConfig } from '../omnistax.config';
import { loadBook } from '../src/lib/content/load';
import { CHECKS, checkContent, contentOf, errorsOf, warningsOf } from '../src/lib/content/check';
import type { Content, Finding } from '../src/lib/content/check';

/* The command's own layer over the build's configuration: the content root and
   the book, either of which may be named on the line. */
type CheckArgs = { readonly root: string; readonly bookId: string };
export const parseArgs = (argv: readonly string[], base: OmniStaxConfig): CheckArgs => {
  const value = (flag: string): string | undefined => { const i = argv.indexOf(flag); return i < 0 ? undefined : argv[i + 1]; };
  return { root: value('--root') ?? base.content.root, bookId: value('--book') ?? base.content.bookId };
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
  const groups = GROUPS.flatMap(({ level, head }) => {
    const own = findings.filter((f) => f.level === level);
    return own.length === 0 ? [] : [[head(own.length), ...own.map((f) => line(f, width(own)))].join('\n')];
  });
  const warnings = warningsOf(findings).length;
  const tally = `${content.chapters.length} chapters, ${sections} sections, ${CHECKS.length} checks, ${errorsOf(findings).length === 0 ? 'no errors' : `${errorsOf(findings).length} errors`}${warnings === 0 ? '' : `, ${warnings} warning${warnings === 1 ? '' : 's'}`}`;
  return [...groups, tally].join('\n\n');
};

/* ---------- the command ---------- */

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2), parseConfig(process.env));
  const content = await contentOf(await loadBook(args.root, args.bookId));
  const findings = checkContent(content);
  console.log(report(findings, content));
  return errorsOf(findings).length === 0 ? 0 : 1;
};

process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1; });
