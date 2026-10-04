/* `tsx scripts/figure-refs.ts <book dir>`: the referents each figure of each section draws, as the checker reads
   them off figures.js (src/lib/content/figrefs.ts), printed as JSON { section: { figure: [referent, …] } } for
   the sections that have referents. omnistax-content/tools/migrate_referent_figures.py reads it. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { figureRefs } from '../src/lib/content/figrefs';

type SectionRowsDTO = { readonly id: string | number; readonly figures?: readonly { readonly id: string }[]; readonly referents?: readonly { readonly id: string }[] };

const sectionFiles = async (dir: string): Promise<readonly string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.filter((e) => e.isDirectory()).map((e) => sectionFiles(path.join(dir, e.name))));
  return [...entries.filter((e) => e.isFile() && e.name === 'section.json').map((e) => path.join(dir, e.name)), ...nested.flat()];
};
const readIf = (p: string): Promise<string> => fs.readFile(p, 'utf8').catch(() => '');

const main = async (dir: string): Promise<void> => {
  const read = await Promise.all((await sectionFiles(dir)).map(async (file) => {
    const s = JSON.parse(await fs.readFile(file, 'utf8')) as SectionRowsDTO;
    if (!s.referents?.length) return [];
    const js = await readIf(path.join(path.dirname(file), 'figures.js'));
    const drawn = figureRefs(js, (s.figures ?? []).map((f) => f.id), s.referents.map((r) => r.id), process.argv[3] !== '--sure');
    return [[String(s.id), Object.fromEntries([...drawn].map(([f, ids]) => [f, [...ids]]))] as const];
  }));
  console.log(JSON.stringify(Object.fromEntries(read.flat()), null, 1));
};

await main(path.resolve(process.argv[2] ?? '.'));
