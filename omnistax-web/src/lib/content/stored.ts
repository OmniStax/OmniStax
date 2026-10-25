/* A deploy builds only the books that changed (docs/release-plan.md, decision
   25). A book is built once per (book commit, book builder) and its output kept
   under the store, which Cloudflare's build cache keeps between deploys
   because it sits in Astro's cache folder. The builder is every app file the
   book's output is made by, found by following imports from the book's routes,
   the offline step and the checker, so nothing is bumped by hand. Both module
   graphs read the plan — astro.config.mjs makes it, the pages read it — so it
   hangs off `globalThis`, as the content versions do. */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { BookFolder } from './load';

/* One book a build carries: built from its folder, or, where `stored` names an
   entry of the store, copied from there. A null key is a book never stored. */
export type CarriedBook = BookFolder & { readonly key: string | null; readonly stored: string | null };
export type BuildPlan = { readonly store: string; readonly books: readonly CarriedBook[] };

/* What an entry of the store holds: the files it drops into the build's output, the records its page shells are rendered from, and its offline catalog row. */
export const STORED_OUT = 'out';
export const STORED_SHELLS = 'shells.json';
export const STORED_ROW = 'row.json';

const sha = (body: string | Buffer): string => crypto.createHash('sha256').update(body).digest('hex');
const git = (dir: string, args: readonly string[]): string | null => {
  try { return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
};

/* The commit a book's folder is exactly, with its place in that repository, or
   null: a book.json no repository tracks (a folder the app repo ignores), or
   anything in the repository changed or added since the commit. */
export const bookCommit = (dir: string): { readonly commit: string; readonly prefix: string } | null => {
  if (git(dir, ['ls-files', '--error-unmatch', 'book.json']) === null) return null;
  if (git(dir, ['status', '--porcelain']) !== '') return null;
  const commit = git(dir, ['rev-parse', 'HEAD']);
  const prefix = git(dir, ['rev-parse', '--show-prefix']);
  return commit === null || prefix === null ? null : { commit, prefix };
};

/* ---------- the builder ---------- */

/* Where the following starts, under the project: every file of the book's
   routes but its page shells, which every build renders, and the files of the
   build that touch a book's output or check it. */
const BOOK_ROUTES = 'src/pages/[...book]';
const ENTRIES = ['content.mjs', 'scripts/build-offline.mjs', 'omnistax.config.ts', 'src/lib/content/stored.ts', 'tests/books/on-disk.test.ts', 'package-lock.json'];
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
const EXTENSIONS = ['', '.ts', '.mjs', '.js', '.svelte', '/index.ts'];
const CODE = /\.(?:ts|mjs|js|svelte|astro)$/;

const isFile = (file: string): boolean => fsSync.statSync(file, { throwIfNoEntry: false })?.isFile() ?? false;
const resolveImport = (from: string, spec: string): string => {
  const base = path.resolve(path.dirname(from), spec.split('?')[0]);
  const file = EXTENSIONS.map((e) => base + e).find(isFile);
  if (file === undefined) throw new Error(`stored: ${from} imports ${spec}, which is no file; the builder cannot be hashed`);
  return file;
};
const routeFiles = (dir: string): readonly string[] =>
  fsSync.readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name !== 'index.astro')
    .map((e) => path.join(e.parentPath, e.name));

/* Every file the book's output is made by, sorted, under the project. */
export const builderFiles = (project: string): readonly string[] => {
  const seen = new Set<string>();
  const todo = [...routeFiles(path.join(project, BOOK_ROUTES)), ...ENTRIES.map((f) => path.join(project, f))];
  while (todo.length > 0) {
    const file = todo.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!CODE.test(file)) continue;
    for (const m of fsSync.readFileSync(file, 'utf8').matchAll(IMPORT)) todo.push(resolveImport(file, m[1]));
  }
  return [...seen].sort();
};
/* The builder as one hash: each file's place and contents, and the settings the output is written with. */
export const builderHash = (project: string, settings: unknown): string =>
  sha(`${builderFiles(project).map((f) => `${path.relative(project, f)}\0${sha(fsSync.readFileSync(f))}`).join('\n')}\n${JSON.stringify(settings)}`);

/* ---------- the plan ---------- */

/* Which of the books a build carries it takes from the store. Off, every book is built and none stored. */
export const planBuild = (store: string, chosen: readonly BookFolder[], builder: string | null): BuildPlan => ({
  store,
  books: chosen.map((f) => {
    const at = builder === null ? null : bookCommit(f.dir);
    const key = at === null ? null : sha(`${at.commit}\0${at.prefix}\0${f.id}\0${builder}`);
    const entry = key === null ? null : path.join(store, key);
    return { ...f, key, stored: entry !== null && isFile(path.join(entry, STORED_ROW)) ? entry : null };
  }),
});

const PLAN = '__omnistaxBuildPlan';
export const setBuildPlan = (plan: BuildPlan): void => { (globalThis as Record<string, unknown>)[PLAN] = plan; };
export const buildPlan = (): BuildPlan | null => ((globalThis as Record<string, unknown>)[PLAN] as BuildPlan | undefined) ?? null;

/* ---------- the store ---------- */

/* Keep one built book: `files` are paths under `out`, copied beside its shells and catalog row. The entry appears whole or not at all. */
export const storeBook = async (entry: string, out: string, files: readonly string[], shells: unknown, row: unknown): Promise<void> => {
  const tmp = `${entry}.tmp-${process.pid}`;
  await fs.rm(tmp, { recursive: true, force: true });
  for (const rel of files) {
    await fs.mkdir(path.dirname(path.join(tmp, STORED_OUT, rel)), { recursive: true });
    await fs.copyFile(path.join(out, rel), path.join(tmp, STORED_OUT, rel));
  }
  await fs.writeFile(path.join(tmp, STORED_SHELLS), JSON.stringify(shells));
  await fs.writeFile(path.join(tmp, STORED_ROW), JSON.stringify(row));
  await fs.rm(entry, { recursive: true, force: true });
  await fs.rename(tmp, entry);
};
/* The store keeps only what this build carries, so it holds one entry a book. */
export const pruneStore = async (plan: BuildPlan): Promise<void> => {
  const keep = new Set(plan.books.flatMap((b) => (b.key === null ? [] : [b.key])));
  const entries = await fs.readdir(plan.store).catch(() => []);
  await Promise.all(entries.filter((e) => !keep.has(e)).map((e) => fs.rm(path.join(plan.store, e), { recursive: true, force: true })));
};
