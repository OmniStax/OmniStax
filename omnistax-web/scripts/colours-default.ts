/* `npm run colours:default -- <book-id> [--dry-run]`: work out the book's default
   colours — the OKLab palette for normal vision, assigned by assignSmart over the
   colour counts of every built page — and store them in book.json `colours`,
   where they stay as written until this is run again, with the order smart
   dealing walks the referent palette in, sorted for these colours at the default
   target. A dry run prints the assignment and how near each page comes to two
   colours read as one, in order and smart, and writes nothing. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseConfig } from '../omnistax.config';
import { findBooks, loadBooks } from '../src/lib/content/load';
import type { BookColoursDTO } from '../src/lib/content/schema';
import { bookId } from '../src/lib/types/ids';
import { type Assignment, assignInOrder, assignSmart, pageNearest } from '../src/lib/colours/assign';
import { fixedOf, pagesOfBook } from '../src/lib/colours/counts';
import { NO_CHOICES, bookReferents, referentOrder } from '../src/lib/colours/model';
import { DEFAULT_REFERENTS, TARGET_DEFAULT } from '../src/lib/colours/referents';
import type { DeltaE } from '../src/lib/colours/oklab';
import { DEFAULT_VISION } from '../src/lib/colours/palettes';
import { oklabHues } from '../src/lib/colours/sample';

const quantile = (xs: readonly number[], q: number): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const summary = (xs: readonly DeltaE[]): string => (xs.length === 0 ? 'no page shows two colours' :
  `median ${quantile(xs, 0.5).toFixed(3)}, p10 ${quantile(xs, 0.1).toFixed(3)}, worst ${[...xs].sort((a, b) => a - b).slice(0, 5).map((x) => x.toFixed(3)).join(' ')}`);

const assignOf = (a: Assignment): BookColoursDTO['assign'] => Object.fromEntries([...a].map(([k, h]) => [k, { light: h.light, dark: h.dark }]));

const main = async (): Promise<number> => {
  const argv = process.argv.slice(2);
  const id = argv.find((a) => !a.startsWith('--'));
  if (!id) { console.error('usage: npm run colours:default -- <book-id> [--dry-run]'); return 1; }
  const dry = argv.includes('--dry-run');
  const config = parseConfig(process.env);
  const [tree] = await loadBooks(config.content.root, { kind: 'named', ids: [bookId(id)] });
  const vision = DEFAULT_VISION;
  const categories = tree.dto.types.map((t) => String(t.id));
  const colours = oklabHues(categories.length, vision);
  const pages = pagesOfBook(tree.manifest);
  const fixed = fixedOf(pages);
  const started = performance.now();
  const smart = assignSmart({ categories, colours, pages, fixed, vision });
  const took = performance.now() - started;
  const inOrder = assignInOrder(categories, colours);
  console.log(`${tree.dto.title}: ${categories.length} types, ${pages.length} pages counted, ${fixed.size} fixed colours, assigned in ${took.toFixed(0)} ms`);
  console.log(`  ${vision}: in order  ${summary(pageNearest(inOrder, pages, fixed, vision))}`);
  console.log(`  ${vision}: smart     ${summary(pageNearest(smart, pages, fixed, vision))}`);
  const assigned: BookColoursDTO = { palette: 'oklab', vision, assign: assignOf(smart) };
  const stored: BookColoursDTO = { ...assigned, referentOrder: [...referentOrder({ ...tree.manifest, colours: assigned }, NO_CHOICES, DEFAULT_REFERENTS.palette, TARGET_DEFAULT)] };
  const dealt = bookReferents({ ...tree.manifest, colours: stored }, NO_CHOICES).flatMap((p) => p.groups.map((g) => ({ g, palette: p.palette })));
  const referents = dealt.reduce((n, { g }) => n + g.ids.length, 0);
  const kept = dealt.reduce((n, { g, palette }) => n + g.hues.filter((h, i) => h === palette[i % palette.length]).length, 0);
  console.log(`  referents: ${referents} in ${dealt.length} groups, ${(100 * kept / Math.max(referents, 1)).toFixed(0)}% at their own place in the sorted palette, ${dealt.filter(({ g }) => g.mode === 'farthest').length} groups farthest apart`);
  if (dry) { console.log(JSON.stringify(stored, null, 1)); return 0; }
  const folder = (await findBooks(config.content.root)).find((f) => f.id === bookId(id));
  if (!folder) { console.error(`no book "${id}"`); return 1; }
  const file = path.join(folder.dir, 'book.json');
  const text = await fs.readFile(file, 'utf8');
  const raw = JSON.parse(text) as Record<string, unknown>;
  const indent = /\n( +|\t)"/.exec(text)?.[1] ?? '  ';
  if (JSON.stringify(raw, null, indent) + '\n' !== text) { console.error(`${file} is not plain JSON.stringify output; refusing to rewrite it`); return 1; }
  await fs.writeFile(file, JSON.stringify({ ...raw, colours: stored }, null, indent) + '\n');
  console.log(`wrote ${file} colours`);
  return 0;
};

process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1; });
