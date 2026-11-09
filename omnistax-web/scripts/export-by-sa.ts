/* `npm run export:by-sa -- <book folder> <out folder>`: a copy of a book with its NonCommercial material
   dropped, for a book shared under CC BY-SA whose NC exercise cards stand in files of their own
   (exercises-nc.json, docs/content-format.md). Every exercises-nc.json is left out, and so are the rows
   of book.json's exercise_sources and sources whose licence is NC, which nothing left names. The copy
   is the book's tracked files where the folder is a git checkout (so a gitignored source cache stays
   behind), else every file but .git and node_modules. The out folder must not exist yet.

   The copy is a book like any other: build or check it by pointing the content root at the folder that
   holds it, `OMNISTAX_CONTENT_DIR=<parent of out> npm run build` (or check:content). Nothing here edits
   the book itself. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isNonCommercial } from '../src/lib/content/schema';

export const NC_FILE = 'exercises-nc.json';
const SKIP_DIRS = new Set(['.git', 'node_modules']);

/* The files of a book, relative to its folder: what git tracks or would track, else every file. */
const walk = async (dir: string, rel = ''): Promise<string[]> => {
  const out: string[] = [];
  for (const d of await fs.readdir(path.join(dir, rel), { withFileTypes: true })) {
    if (d.isDirectory()) { if (!SKIP_DIRS.has(d.name)) out.push(...(await walk(dir, path.join(rel, d.name)))); } else out.push(path.join(rel, d.name));
  }
  return out;
};
const exists = (file: string): Promise<boolean> => fs.access(file).then(() => true, () => false);
const filesOf = async (dir: string): Promise<readonly string[]> => {
  let listed: string[];
  try {
    listed = execFileSync('git', ['-C', dir, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean);
  } catch { return walk(dir); }
  const here = await Promise.all(listed.map((f) => exists(path.join(dir, f))));
  return listed.filter((_, i) => here[i]);   /* a tracked file deleted in the work tree is not copied */
};

type Row = { readonly id?: string; readonly license?: string };
/* book.json without the NC rows of its two source tables, and the ids it dropped. */
export const withoutNcRows = (book: Record<string, unknown>): { readonly book: Record<string, unknown>; readonly dropped: readonly string[] } => {
  const dropped: string[] = [];
  const keep = (rows: unknown): unknown => (Array.isArray(rows) ? rows.filter((r: Row) => { const nc = isNonCommercial(r.license); if (nc) dropped.push(r.id ?? '?'); return !nc; }) : rows);
  const out = { ...book };
  if ('exercise_sources' in out) out.exercise_sources = keep(out.exercise_sources);
  if ('sources' in out) out.sources = keep(out.sources);
  return { book: out, dropped };
};

/* Whether a relative path is an NC card file, and so stays behind. */
export const isNcFile = (rel: string): boolean => path.basename(rel) === NC_FILE;

const main = async (): Promise<number> => {
  const [from, to] = process.argv.slice(2);
  if (!from || !to) { console.error('usage: npm run export:by-sa -- <book folder> <out folder>'); return 1; }
  const src = path.resolve(from), out = path.resolve(to);
  if (!(await exists(path.join(src, 'book.json')))) { console.error(`${src} holds no book.json`); return 1; }
  if (await exists(out)) { console.error(`${out} exists already; name a folder that does not`); return 1; }
  const files = await filesOf(src);
  const nc = files.filter(isNcFile);
  for (const rel of files.filter((f) => !isNcFile(f))) {
    const target = path.join(out, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (rel === 'book.json') {
      const raw = await fs.readFile(path.join(src, rel), 'utf8');
      const { book, dropped } = withoutNcRows(JSON.parse(raw) as Record<string, unknown>);
      await fs.writeFile(target, `${JSON.stringify(book, null, 2)}\n`, 'utf8');
      if (dropped.length) console.log(`book.json: dropped the NC source rows ${dropped.join(', ')}`);
    } else await fs.copyFile(path.join(src, rel), target);
  }
  console.log(`${path.relative(process.cwd(), out) || out}: ${files.length - nc.length} files; left out ${nc.length} ${NC_FILE}${nc.length ? ` (${nc.map((f) => path.dirname(f)).join(', ')})` : ''}`);
  return 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1; });
}
