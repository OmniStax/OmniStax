/* Identifiers used across the shell. Branded strings keep a section id from
   being confused with a chapter id, a group key or a DOM id; ItemId is an ADT
   because a tab can hold six different things: a document, a view, one figure
   split out of a document, one exercise on its own, one of the standing pages
   of the site, or a note the reader has written. */

/* One textbook of the library: the id its book.json carries, which names its
   pages, the storage it keeps and the colour file the reader exports. */
export type BookId = string & { readonly __brand: 'BookId' };
/* Where the books sit on disk: the directory that holds one folder per book,
   and one book's own folder inside it. A folder is named for the book's title
   rather than its id, so the two are branded apart and never swapped. */
export type ContentRoot = string & { readonly __brand: 'ContentRoot' };
export type BookDir = string & { readonly __brand: 'BookDir' };
export type SectionId = string & { readonly __brand: 'SectionId' };
export type ChapterId = string & { readonly __brand: 'ChapterId' };
export type GroupKey = string & { readonly __brand: 'GroupKey' };
export type SpanId = string & { readonly __brand: 'SpanId' };
export type ConceptId = string & { readonly __brand: 'ConceptId' };
/* One declared type of physical quantity, e.g. "position": the key the book's
   `types` table is read by, the class a coloured symbol wears, and the hue a
   page binds. */
export type TypeId = string & { readonly __brand: 'TypeId' };
/* One equation of the formula sheet, e.g. "eq-hooke". */
export type EquationId = string & { readonly __brand: 'EquationId' };
export type NoteId = string & { readonly __brand: 'NoteId' };
/* One reference sheet of the book, e.g. "elements": the id its book.json
   declares, which names the sheet's page and its tab. */
export type SheetId = string & { readonly __brand: 'SheetId' };
/* One page of a view: several concept maps may stand open at once, and this is what
   tells them apart. A view with no instance is the singleton the sidebar holds. */
export type ViewInstance = string & { readonly __brand: 'ViewInstance' };

export const bookId = (s: string): BookId => s as BookId;
export const contentRoot = (s: string): ContentRoot => s as ContentRoot;
export const bookDir = (s: string): BookDir => s as BookDir;
export const sectionId = (s: string): SectionId => s as SectionId;
export const chapterId = (s: string): ChapterId => s as ChapterId;
export const groupKey = (s: string): GroupKey => s as GroupKey;
export const spanId = (s: string): SpanId => s as SpanId;
export const conceptId = (s: string): ConceptId => s as ConceptId;
export const typeId = (s: string): TypeId => s as TypeId;
export const equationId = (s: string): EquationId => s as EquationId;
export const noteId = (s: string): NoteId => s as NoteId;
export const sheetId = (s: string): SheetId => s as SheetId;
export const newGroupKey = (): GroupKey => groupKey(Math.random().toString(36).slice(2, 8));
/* A note's id is eight lowercase letters and digits, which is the shape the key form reads back. */
export const newNoteId = (): NoteId => noteId(Math.random().toString(36).slice(2, 10).padEnd(8, '0'));
export const viewInstance = (s: string): ViewInstance => s as ViewInstance;
/* Six of them for a view's instance, in the same shape its key form reads back. */
export const newViewInstance = (): ViewInstance => viewInstance(Math.random().toString(36).slice(2, 8).padEnd(6, '0'));

export type DocKind = 'text';
/* The companion views, in the order the rail draws their buttons. Three of them
   may stand in the left sidebar as well as in a group — the explorer, which is
   the whole tree, the search, which reads every book of the library, and the
   annotations — and the rest are only ever opened as tabs. Exercises comes
   immediately before the concept map, since practice is the map's other face:
   the map says what the book teaches, and the exercises say how much of it the
   reader has made their own. */
export const VIEW_KINDS = ['explorer', 'search', 'exercises', 'concepts', 'formulas', 'definitions', 'annotations', 'colours'] as const;
export type ViewKind = (typeof VIEW_KINDS)[number];
export const SIDEBAR_KINDS = ['explorer', 'search', 'annotations'] as const;
export type SidebarKind = (typeof SIDEBAR_KINDS)[number];
export const isSidebarKind = (kind: ViewKind): kind is SidebarKind => (SIDEBAR_KINDS as readonly string[]).includes(kind);
/* The views the rail draws no button for, because they are asked for by name
   rather than kept to hand: the colour menu is one page the reader opens from
   the command palette when they want to change a colour. */
export const PALETTE_ONLY_KINDS = ['colours'] as const;
export type PaletteOnlyKind = (typeof PALETTE_ONLY_KINDS)[number];
export const isPaletteOnlyKind = (kind: ViewKind): kind is PaletteOnlyKind => (PALETTE_ONLY_KINDS as readonly string[]).includes(kind);

/* The standing pages of the site: the front of OmniStax and the front of the book. */
export const PAGE_KINDS = ['about', 'book'] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

export type ItemId =
  | { readonly kind: 'doc'; readonly section: SectionId; readonly doc: DocKind }
  | { readonly kind: 'view'; readonly view: ViewKind; readonly instance?: ViewInstance }   /* instance: one page of that view; none is the singleton a sidebar holds */
  | { readonly kind: 'fig'; readonly section: SectionId; readonly fig: string }    /* fig: the figure's local id, e.g. sim-plane */
  | { readonly kind: 'page'; readonly page: PageKind }
  | { readonly kind: 'note'; readonly note: NoteId }
  | { readonly kind: 'sheet'; readonly sheet: SheetId };   /* one of the book's reference sheets, drawn by the app from the sheet's data */

export const docItem = (section: SectionId, doc: DocKind): ItemId => ({ kind: 'doc', section, doc });
export const viewItem = (view: ViewKind, instance?: ViewInstance): ItemId => (instance ? { kind: 'view', view, instance } : { kind: 'view', view });
/* A page of a view of its own, which is what the rail opens: every click is another one. */
export const newViewItem = (view: ViewKind): ItemId => viewItem(view, newViewInstance());
export const figItem = (section: SectionId, fig: string): ItemId => ({ kind: 'fig', section, fig });
export const pageItem = (page: PageKind): ItemId => ({ kind: 'page', page });
export const noteItem = (note: NoteId): ItemId => ({ kind: 'note', note });
export const sheetItem = (sheet: SheetId): ItemId => ({ kind: 'sheet', sheet });
/* Documents and figures belong to a section; a view describes a scope
   of its own, and a page and a note belong to no section at all. */
export const sectionOfItem = (id: ItemId): SectionId | null => (id.kind === 'doc' || id.kind === 'fig' ? id.section : null);

/* The string form is what layouts persist and what the DOM carries in data attributes. */
export const itemKey = (id: ItemId): string =>
  id.kind === 'doc' ? `doc:${id.section}/${id.doc}`
    : id.kind === 'fig' ? `fig:${id.section}/${id.fig}`
      : id.kind === 'page' ? `page:${id.page}`
        : id.kind === 'note' ? `note:${id.note}`
          : id.kind === 'sheet' ? `sheet:${id.sheet}`
            : id.instance ? `view:${id.view}@${id.instance}` : `view:${id.view}`;
export const parseItemKey = (s: string): ItemId | null => {
  const view = /^view:(\w+)(?:@([a-z0-9]{6}))?$/.exec(s);
  if (view) return (VIEW_KINDS as readonly string[]).includes(view[1]) ? viewItem(view[1] as ViewKind, view[2] ? viewInstance(view[2]) : undefined) : null;
  const page = /^page:(\w+)$/.exec(s);
  if (page) return (PAGE_KINDS as readonly string[]).includes(page[1]) ? pageItem(page[1] as PageKind) : null;
  const note = /^note:([a-z0-9]{8})$/.exec(s);
  if (note) return noteItem(noteId(note[1]));
  const sheet = /^sheet:([\w.-]+)$/.exec(s);
  if (sheet) return sheetItem(sheetId(sheet[1]));
  const doc = /^doc:([^/]+)\/(text)$/.exec(s);
  if (doc) return docItem(sectionId(doc[1]), 'text');
  const fig = /^fig:([^/]+)\/([\w-]+)$/.exec(s);
  if (fig) return figItem(sectionId(fig[1]), fig[2]);
  return null;
};
export const sameItem = (a: ItemId, b: ItemId): boolean => itemKey(a) === itemKey(b);
export const isView = (id: ItemId): id is Extract<ItemId, { kind: 'view' }> => id.kind === 'view';
/* A view that may stand in the sidebar as well as in a group; only the singleton does,
   since a sidebar holds one of each. */
export const isSidebarView = (id: ItemId): boolean => isView(id) && !id.instance && isSidebarKind(id.view);
/* The kind of view a key names, and nothing when it names something else. */
export const viewKindOf = (k: string): ViewKind | null => { const id = parseItemKey(k); return id !== null && isView(id) ? id.view : null; };

/* DOM ids inside a section are qualified by the section at build time: "2.1-displacement". */
export const qualifiedId = (section: SectionId, local: string): SpanId => spanId(`${section}-${local}`);
export const exerciseDomId = (section: SectionId, exerciseId: string): SpanId => spanId(`${section}-ex-${exerciseId}`);
export const sectionOfSpan = (id: SpanId): SectionId => sectionId(id.split('-')[0]);
