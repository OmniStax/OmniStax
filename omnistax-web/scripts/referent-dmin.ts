/* `npx tsx scripts/referent-dmin.ts [book-id …]`: sweep the smart referent
   threshold D_MIN over 0.00 to 0.20 for every book (or those named), with the
   book's default category colours worked out afresh (assignSmart on the OKLab
   palette for deutan vision) and the default referent palette, for normal and
   each of the four visions. Per value it prints the share of referents moved off their
   in-order colour, the sections dealt in order because smart found no way, and
   the nearest any referent stands to a colour of its page, and per vision the
   largest value with no fallback and at most a quarter moved. Not part of the build. */
import { parseConfig } from '../omnistax.config';
import { findBooks, loadBooks } from '../src/lib/content/load';
import { bookPagesOf } from '../src/lib/content/roles';
import { assignSmart } from '../src/lib/colours/assign';
import { countsOfRecord, fixedOf, pagesOfBook } from '../src/lib/colours/counts';
import { type DeltaE, type Vision, VISIONS, distance } from '../src/lib/colours/oklab';
import { DEFAULT_VISION } from '../src/lib/colours/palettes';
import { REFERENT_COUNT, dealInOrder, dealReferents, pageColours } from '../src/lib/colours/referents';
import { oklabAfter, oklabHues } from '../src/lib/colours/sample';
import type { Hue } from '../src/lib/colours/model';

type Page = { readonly id: string; readonly ids: readonly string[]; readonly shown: readonly Hue[] };
type Row = { readonly dMin: DeltaE; readonly moved: number; readonly referents: number; readonly fellBack: number; readonly sections: number; readonly nearest: DeltaE };

const STEPS: readonly DeltaE[] = Array.from({ length: 21 }, (_, i) => i / 100);
const MOVED_AT_MOST = 0.25;

const nearestOf = (hues: Iterable<Hue>, shown: readonly Hue[], vision: Vision): DeltaE =>
  Math.min(Infinity, ...[...hues].flatMap((h) => shown.map((s) => distance(h, s, vision))));

const sweep = (pages: readonly Page[], palette: readonly Hue[], vision: Vision): readonly Row[] =>
  STEPS.map((dMin) => {
    const dealt = pages.map((p) => ({ p, d: dealReferents({ ids: p.ids, palette, page: p.shown, mode: 'smart', vision, dMin }), order: dealInOrder(p.ids, palette) }));
    return {
      dMin,
      referents: pages.reduce((n, p) => n + p.ids.length, 0),
      moved: dealt.reduce((n, { p, d, order }) => n + p.ids.filter((id) => d.hues.get(id) !== order.get(id)).length, 0),
      sections: pages.length,
      fellBack: dealt.filter(({ d }) => d.mode === 'order').length,
      nearest: Math.min(...dealt.map(({ p, d }) => nearestOf(d.hues.values(), p.shown, vision))),
    };
  });

const pct = (a: number, b: number): string => `${((100 * a) / Math.max(b, 1)).toFixed(1)}%`;

const main = async (): Promise<number> => {
  const config = parseConfig(process.env);
  const named = process.argv.slice(2);
  const books = (await findBooks(config.content.root)).filter((b) => named.length === 0 || named.includes(String(b.id)));
  for (const book of books) {
    const [tree] = await loadBooks(config.content.root, { kind: 'named', ids: [book.id] });
    const m = tree.manifest;
    const categories = Object.keys(m.types);
    const counted = pagesOfBook(m);
    const fixed = fixedOf(counted);
    const assigned = assignSmart({ categories, colours: oklabHues(categories.length, DEFAULT_VISION), pages: counted, fixed, vision: DEFAULT_VISION });
    const pages: readonly Page[] = bookPagesOf(m).flatMap((e) => (e.referents?.length
      ? [{ id: e.id, ids: e.referents.map((r) => r.id), shown: pageColours(countsOfRecord(e.counts ?? {}), (k) => assigned.get(k) ?? null) }]
      : []));
    const keys = counted.flatMap((p) => [...p.keys()]);
    console.log(`${m.title}: ${categories.length} types, ${pages.length} sections with referents, ${pages.reduce((n, p) => n + p.ids.length, 0)} referents, ` +
      `${keys.filter((k) => k.startsWith('el:')).length} convention and ${keys.filter((k) => k.startsWith('#')).length} fact page-keys, ${pages.filter((p) => p.ids.length > REFERENT_COUNT).length} sections over ${REFERENT_COUNT}`);
    for (const vision of VISIONS) {
      const palette = oklabAfter([...assigned.values()], REFERENT_COUNT, vision);
      console.log(`  ${vision}:  D_MIN  moved   fallbacks  nearest`);
      const rows = sweep(pages, palette, vision);
      rows.forEach((r) =>
        console.log(`          ${r.dMin.toFixed(2)}  ${pct(r.moved, r.referents).padStart(6)}  ${String(r.fellBack).padStart(3)} ${pct(r.fellBack, r.sections).padStart(6)}  ${r.nearest.toFixed(3)}`));
      const passing = rows.filter((r) => r.fellBack === 0 && r.moved <= MOVED_AT_MOST * r.referents).map((r) => r.dMin);
      console.log(`  ${vision}: largest passing ${Math.max(...passing).toFixed(2)}`);
    }
  }
  return 0;
};

process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1; });
