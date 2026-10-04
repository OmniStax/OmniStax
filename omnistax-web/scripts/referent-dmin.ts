/* `npx tsx scripts/referent-dmin.ts [book-id …]`: the sweep behind each book's
   stored `colours.dmin`, for every book (or those named) with its stored default
   colours and the default referent palette, for each of the four visions. Per
   value of dMin it prints the share of referents moved off their in-order colour
   and the sections dealt in order because smart found no way, and per vision the
   value bestDMin picks. Not part of the build. */
import { parseConfig } from '../omnistax.config';
import { findBooks, loadBooks } from '../src/lib/content/load';
import { VISIONS } from '../src/lib/colours/oklab';
import { NO_CHOICES, dMinInputOf } from '../src/lib/colours/model';
import { bestDMin, dMinSweep } from '../src/lib/colours/referents';

const pct = (a: number, b: number): string => `${((100 * a) / Math.max(b, 1)).toFixed(1)}%`;

const main = async (): Promise<number> => {
  const config = parseConfig(process.env);
  const named = process.argv.slice(2);
  const books = (await findBooks(config.content.root)).filter((b) => named.length === 0 || named.includes(String(b.id)));
  for (const book of books) {
    const [tree] = await loadBooks(config.content.root, { kind: 'named', ids: [book.id] });
    const m = tree.manifest;
    console.log(`${m.title}: stored dmin ${JSON.stringify(m.colours?.dmin ?? null)}`);
    for (const vision of VISIONS) {
      const input = dMinInputOf(m, { ...NO_CHOICES, vision });
      const referents = input.pages.reduce((n, p) => n + p.ids.length, 0);
      console.log(`  ${vision}: ${input.pages.length} sections, ${referents} referents\n    dMin  moved   fallbacks`);
      dMinSweep(input).forEach((r) =>
        console.log(`    ${r.dMin.toFixed(2)}  ${pct(r.moved, referents).padStart(6)}  ${String(r.fellBack).padStart(3)} ${pct(r.fellBack, input.pages.length).padStart(6)}`));
      console.log(`  ${vision}: best ${bestDMin(input).toFixed(2)}`);
    }
  }
  return 0;
};

process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1; });
