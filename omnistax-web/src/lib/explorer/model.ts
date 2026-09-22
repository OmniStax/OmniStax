/* The reader's own tree: the folders they make, the notes they write, the
   drawings and files they keep and the textbooks they have added, hanging
   under two fixed roots — OmniBooks and Your Files.
   Which root a row belongs to is its kind: a book is always under OmniBooks,
   everything else always under Your Files, so a row at the top of the tree
   needs nothing said about it beyond what it is. The
   tree is a plain immutable value — a flat list of entries, each naming its
   parent, and the set of rows the reader has opened — and every operation
   here is a pure function from Tree to Tree; the store applies them and
   persists. Rows that belong to a book (its chapters and sections) are not
   entries at all: they are read from the manifest, so only their expanded
   state is kept here, under the keys at the foot of this file. */

export type EntryId = string & { readonly __brand: 'EntryId' };
export const entryId = (s: string): EntryId => s as EntryId;
/* Eight characters of base 36, the same shape a note document's id takes. */
export const newEntryId = (): EntryId => {
  let s = '';
  while (s.length < 8) s += Math.random().toString(36).slice(2);
  return entryId(s.slice(0, 8));
};

export type EntryKind = 'folder' | 'note' | 'book' | 'drawing' | 'file';
/* A note entry shares its id with the note document it stands for; a book
   entry names the book of the manifest it draws its chapters from. A drawing
   and a file name theirs the same way a book does, in a field of their own,
   because the store that keeps the bytes is not this one: the row says which
   record it stands for, and the store is asked for it when the tab opens. */
export type Entry = {
  readonly id: EntryId; readonly parent: EntryId | null; readonly kind: EntryKind;
  readonly name: string; readonly bookId?: string; readonly fileId?: string; readonly drawingId?: string;
};
export type Tree = { readonly entries: readonly Entry[]; readonly expanded: readonly string[] };

export const emptyTree = (): Tree => ({ entries: [], expanded: [] });

/* The keys under which the rows of a book remember that they are open. */
export const bookKey = (bookId: string): string => `book:${bookId}`;
export const chapterKey = (bookId: string, chapterId: string): string => `chapter:${bookId}/${chapterId}`;
export const sectionKey = (bookId: string, sectionId: string): string => `section:${bookId}/${sectionId}`;

export const entryById = (t: Tree, id: EntryId): Entry | undefined => t.entries.find((e) => e.id === id);

/* Folders lead, then the textbooks, then what the reader has written, drawn
   and imported, in that order; each run is in the order a reader would look
   for a name. */
const RANK: Readonly<Record<EntryKind, number>> = { folder: 0, book: 1, note: 2, drawing: 3, file: 4 };
const byName = (a: Entry, b: Entry): number =>
  RANK[a.kind] - RANK[b.kind] || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id);
export const childrenOf = (t: Tree, parent: EntryId | null): Entry[] => t.entries.filter((e) => e.parent === parent).sort(byName);

/* The names from the root down to this entry, joined with a slash. The root
   row itself is not named: a note directly under User is simply its own name.
   Passing null asks for the path of the root, which is empty. */
export const pathOf = (t: Tree, id: EntryId | null): string => {
  const names: string[] = [];
  const seen = new Set<EntryId>();
  let at = id;
  while (at !== null && !seen.has(at)) {
    seen.add(at);
    const e = entryById(t, at); if (!e) break;
    names.unshift(e.name); at = e.parent;
  }
  return names.join('/');
};

/* The entry itself and everything beneath it, children after their parent, so
   that a caller removing a folder can delete the note documents it held. */
export const descendants = (t: Tree, id: EntryId): EntryId[] => {
  const out: EntryId[] = [id];
  for (let i = 0; i < out.length; i++) out.push(...t.entries.filter((e) => e.parent === out[i]).map((e) => e.id));
  return out;
};

const isAncestor = (t: Tree, ancestor: EntryId, of: EntryId | null): boolean => {
  const seen = new Set<EntryId>();
  let at = of;
  while (at !== null && !seen.has(at)) {
    if (at === ancestor) return true;
    seen.add(at); at = entryById(t, at)?.parent ?? null;
  }
  return false;
};

const withEntries = (t: Tree, entries: readonly Entry[]): Tree => ({ ...t, entries });
const add = (t: Tree, e: Entry): Tree => withEntries(t, [...t.entries, e]);

export const addFolder = (t: Tree, parent: EntryId | null, name: string, id: EntryId = newEntryId()): Tree =>
  add(t, { id, parent, kind: 'folder', name });

/* The note document is written by its own store under the very same id. */
export const addNote = (t: Tree, parent: EntryId | null, id: EntryId, name: string): Tree =>
  add(t, { id, parent, kind: 'note', name });

/* A file and a drawing sit beside the notes under Your Files and move as they
   do. Their record's id is the row's id as well, as a note's is, so that one
   id follows the thing through the tree, the tab and the link; it is written
   in its own field too, so that a row says what store to ask without the
   caller having to know the kind's convention. */
export const addFile = (t: Tree, parent: EntryId | null, id: EntryId, name: string): Tree =>
  add(t, { id, parent, kind: 'file', name, fileId: id });

export const addDrawing = (t: Tree, parent: EntryId | null, id: EntryId, name: string): Tree =>
  add(t, { id, parent, kind: 'drawing', name, drawingId: id });

/* A book joins the root row once and only once, however often it is added. */
export const addBook = (t: Tree, bookId: string, name: string, id: EntryId = newEntryId()): Tree =>
  t.entries.some((e) => e.kind === 'book' && e.bookId === bookId) ? t : add(t, { id, parent: null, kind: 'book', name, bookId });

export const rename = (t: Tree, id: EntryId, name: string): Tree =>
  withEntries(t, t.entries.map((e) => (e.id === id ? { ...e, name } : e)));

/* Removing a row removes everything it held. */
export const remove = (t: Tree, id: EntryId): Tree => {
  const gone = new Set<EntryId>(descendants(t, id));
  return withEntries(t, t.entries.filter((e) => !gone.has(e.id)));
};

/* A row may go anywhere but inside itself, and only within its own root: a
   book never moves, and everything else only ever goes into a folder. */
export const move = (t: Tree, id: EntryId, parent: EntryId | null): Tree => {
  const e = entryById(t, id);
  if (!e || e.kind === 'book' || isAncestor(t, id, parent)) return t;
  if (parent !== null && entryById(t, parent)?.kind !== 'folder') return t;
  return withEntries(t, t.entries.map((e) => (e.id === id ? { ...e, parent } : e)));
};

export const isExpanded = (t: Tree, key: string): boolean => t.expanded.includes(key);
export const toggleExpanded = (t: Tree, key: string): Tree =>
  ({ ...t, expanded: isExpanded(t, key) ? t.expanded.filter((k) => k !== key) : [...t.expanded, key] });

/* "Untitled", then "Untitled 2", counting up until the name is free among the
   rows that share this parent. */
export const uniqueName = (t: Tree, parent: EntryId | null, base: string): string => {
  const taken = new Set(t.entries.filter((e) => e.parent === parent).map((e) => e.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) { const name = `${base} ${n}`; if (!taken.has(name.toLowerCase())) return name; }
};

/* The storage boundary: anything that is not a sound tree is refused, and an
   entry that names a parent no longer there is lifted back to the root. */
const KINDS: readonly EntryKind[] = ['folder', 'note', 'book', 'drawing', 'file'];
/* The kinds that name a record of another store, and the field each names it
   in: a row missing its own is not a sound row, and the whole tree is refused
   rather than a row being kept that points at nothing. */
const REF_FIELD: Readonly<Partial<Record<EntryKind, 'bookId' | 'fileId' | 'drawingId'>>> =
  { book: 'bookId', file: 'fileId', drawing: 'drawingId' };
const parseEntry = (raw: unknown): Entry | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return null;
  if (typeof o.name !== 'string') return null;
  if (!KINDS.includes(o.kind as EntryKind)) return null;
  if (o.parent !== null && typeof o.parent !== 'string') return null;
  const kind = o.kind as EntryKind;
  const field = REF_FIELD[kind];
  if (field && typeof o[field] !== 'string') return null;
  const base = { id: entryId(o.id), parent: o.parent === null ? null : entryId(o.parent as string), kind, name: o.name };
  return field ? { ...base, [field]: o[field] as string } : base;
};
export const parseTree = (raw: unknown): Tree | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.entries)) return null;
  const parsed = o.entries.map(parseEntry);
  if (parsed.some((e) => e === null)) return null;
  const seen = new Set<EntryId>();
  const entries = (parsed as Entry[]).filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
  const known = new Set(entries.map((e) => e.id));
  const parentOf = new Map(entries.map((e) => [e.id, e.parent] as const));
  /* A parent that has gone, or a chain that comes back round on itself, would
     hide a row for good; either way the row returns to the root. */
  const sound = (e: Entry): boolean => {
    const walked = new Set<EntryId>([e.id]);
    let at = e.parent;
    while (at !== null) { if (!known.has(at) || walked.has(at)) return false; walked.add(at); at = parentOf.get(at) ?? null; }
    return true;
  };
  const rooted = entries.map((e) => (sound(e) ? e : { ...e, parent: null }));
  const expanded = Array.isArray(o.expanded) ? o.expanded.filter((k): k is string => typeof k === 'string') : [];
  return { entries: rooted, expanded };
};

/* ── the two roots ───────────────────────────────────────────────────────── */

/* The tree once held one root, User, with the notes, the folders and the books
   all mixed under it; it now holds OmniBooks and Your Files, and a row's kind says which
   it is under. Reading an older tree therefore only has to lift the books out
   of whatever folder they were sitting in — nothing else about the shape has
   changed, and no note, folder or added book is lost doing it. */
export const toRoots = (t: Tree): Tree =>
  withEntries(t, t.entries.map((e) => (e.kind === 'book' && e.parent !== null ? { ...e, parent: null } : e)));

/* What the store loads: the storage boundary, then the lift above. */
export const migrateTree = (raw: unknown): Tree | null => {
  const t = parseTree(raw);
  return t === null ? null : toRoots(t);
};
