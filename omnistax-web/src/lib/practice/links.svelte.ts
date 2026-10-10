/* The files an exercise has gathered: the notes, drawings and chats the reader
   made beside it or linked to it, by their item keys. They live as ordinary
   rows of the explorer, filed flat in one folder at the top of Your Files, so
   the reader can move, rename and relink them like anything else of theirs. */
import { readerWritesAllowed } from '../backup/guard';
import { entryId, type EntryId } from '../explorer/model';
import { explorer } from '../explorer/store.svelte';
import type { ExerciseDTO } from '../content/schema';
import { books } from './books.svelte';
import { generated } from './generated.svelte';
import { exerciseName, plain } from './labels';
import { practice } from './store.svelte';
import type { ExerciseRef } from './model';

export type ExKey = string;
type Saved = { readonly folder: string | null; readonly links: Readonly<Record<ExKey, readonly string[]>> };

const KEY = 'omnistax-practice-links-v1';
const FOLDER = '_practice';

export const exKeyOf = (ref: ExerciseRef): ExKey => `${ref.book}/${ref.section}/${ref.ex}`;
const refOf = (key: ExKey): ExerciseRef | null => {
  const m = /^(.+)\/([^/]+)\/([^/]+)$/.exec(key);
  return m ? { book: m[1], section: m[2] as ExerciseRef['section'], ex: m[3] } : null;
};
/* The row an item key stands for: notes, drawings and chats share their id with their row. */
export const entryOfKey = (key: string): EntryId | null => { const m = /^(?:note|drawing|chat):([a-z0-9]{8})$/.exec(key); return m ? entryId(m[1]) : null; };
const today = (): string => new Date().toLocaleDateString('en-CA');

const read = (): Saved => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Saved> | null;
    return { folder: typeof v?.folder === 'string' ? v.folder : null, links: v?.links && typeof v.links === 'object' ? v.links : {} };
  } catch { return { folder: null, links: {} }; }
};

class Links {
  saved = $state.raw<Saved>(typeof localStorage === 'undefined' ? { folder: null, links: {} } : read());

  of(ref: ExerciseRef): readonly string[] { return this.saved.links[exKeyOf(ref)] ?? []; }
  forItem(key: string): readonly ExerciseRef[] {
    return Object.entries(this.saved.links).flatMap(([k, items]) => { const r = items.includes(key) ? refOf(k) : null; return r ? [r] : []; });
  }
  add(ref: ExerciseRef, key: string): void {
    const now = this.of(ref);
    if (!now.includes(key)) this.put({ ...this.saved, links: { ...this.saved.links, [exKeyOf(ref)]: [...now, key] } });
  }
  remove(ref: ExerciseRef, key: string): void {
    const rest = this.of(ref).filter((k) => k !== key);
    const { [exKeyOf(ref)]: _gone, ...others } = this.saved.links;
    this.put({ ...this.saved, links: rest.length ? { ...others, [exKeyOf(ref)]: rest } : others });
  }

  /* The `_practice` folder, made at the top of Your Files the first time it is wanted and again if the reader deleted it. */
  folder(): EntryId {
    const held = this.saved.folder ? explorer.entry(entryId(this.saved.folder)) : undefined;
    if (held?.kind === 'folder') return held.id;
    const found = explorer.children(null).find((e) => e.kind === 'folder' && e.name === FOLDER);
    const id = found?.id ?? explorer.addFolder(null, FOLDER);
    this.put({ ...this.saved, folder: id });
    return id;
  }

  /* "<concept> · <exercise> · <date>", numbered when the folder already holds that name. */
  fileName(ref: ExerciseRef, ex?: ExerciseDTO): string {
    const dto = ex ?? generated.exercise(ref.ex) ?? books.exercise(ref.book, ref.section, ref.ex);
    const concept = dto?.concepts[0] ? practice.conceptOf(dto.concepts[0], ref.book)?.name : undefined;
    const base = [concept && plain(concept), dto ? exerciseName(dto) : ref.ex, today()].filter(Boolean).join(' · ');
    const taken = new Set(explorer.children(this.folder()).map((e) => e.name));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base} (${n})`)) n++;
    return `${base} (${n})`;
  }

  private put(next: Saved): void {
    this.saved = next;
    if (!readerWritesAllowed()) return;
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  }
}

export const links = new Links();
