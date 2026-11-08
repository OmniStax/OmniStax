/* `npm run check:code`: run every code answer's reference against its tests
   and, where it names a bound, count how its steps grow. The rules live in
   src/lib/code/references.ts; this file is only the command — which books, the
   runner (`python3 -I` from a fresh temp directory, src/lib/code/node.ts), and
   what the shell is told. `--root <dir>` and `--books <ids>` as check:content. */
import path from 'node:path';
import { parseBooks, parseConfig } from '../omnistax.config';
import { loadBooks } from '../src/lib/content/load';
import { contentOf, errorsOf, warningsOf, type Finding } from '../src/lib/content/check';
import { bookPagesOf } from '../src/lib/content/roles';
import { contentRoot } from '../src/lib/types/ids';
import { cpythonRunner, growInNode } from '../src/lib/code/node';
import { checkReferences, referenceCount } from '../src/lib/code/references';

const value = (argv: readonly string[], flag: string): string | undefined => { const i = argv.indexOf(flag); return i < 0 ? undefined : argv[i + 1]; };

const main = async (): Promise<number> => {
  const argv = process.argv.slice(2), base = parseConfig(process.env);
  const root = value(argv, '--root'), named = value(argv, '--books') ?? value(argv, '--book');
  const books = await loadBooks(root === undefined ? base.content.root : contentRoot(path.resolve(root)), named === undefined ? base.content.books : parseBooks(named));
  const python = cpythonRunner();
  await python.load();
  let failed = false;
  for (const book of books) {
    const content = await contentOf(book);
    const pages = bookPagesOf(content);
    const findings: readonly Finding[] = await checkReferences(pages, { python }, growInNode);
    const errors = errorsOf(findings).length, warnings = warningsOf(findings).length;
    const pad = findings.reduce((w, f) => Math.max(w, f.where.length), 0);
    console.log([
      `${content.book.title} (${content.book.id})`,
      ...findings.map((f) => `  ${f.level === 'error' ? 'error  ' : 'warning'}  ${f.where.padEnd(pad)}  ${f.what}`),
      `${referenceCount(pages, ['python'])} Python references, ${errors === 0 ? 'no errors' : `${errors} error${errors === 1 ? '' : 's'}`}${warnings === 0 ? '' : `, ${warnings} warning${warnings === 1 ? '' : 's'}`}`,
    ].join('\n'));
    failed ||= errors > 0;
  }
  return failed ? 1 : 0;
};

process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1; });
