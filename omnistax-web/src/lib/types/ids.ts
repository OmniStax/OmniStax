/* Identifiers used across the shell. Branded strings keep a section id from
   being confused with a chapter id, a group key or a DOM id; ItemId is an ADT
   because a tab can hold many different things: a document, a view, one figure
   split out of a document, one of the standing pages of the site, a reference
   sheet, a note the reader has written, a file they have imported, a drawing
   they have made, a chat they have held, or one exercise on its own. */

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
/* The three other things the reader owns, each kept by its own store and each
   named by eight characters of base 36, the shape a note's id takes: a file
   they have imported, a drawing they have made, a chat they have held. They
   are branded apart because a tab, a link and an explorer row all carry one,
   and none of the three means anything to the store that keeps another. */
export type FileId = string & { readonly __brand: 'FileId' };
export type DrawingId = string & { readonly __brand: 'DrawingId' };
export type ChatId = string & { readonly __brand: 'ChatId' };
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
export const fileId = (s: string): FileId => s as FileId;
export const drawingId = (s: string): DrawingId => s as DrawingId;
export const chatId = (s: string): ChatId => s as ChatId;
export const sheetId = (s: string): SheetId => s as SheetId;
export const newGroupKey = (): GroupKey => groupKey(Math.random().toString(36).slice(2, 8));
/* Eight lowercase letters and digits, which is the shape the key form reads
   back; one draw of Math.random can fall short of eight, so it draws again. */
const base36 = (n: number): string => { let s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); };
export const newNoteId = (): NoteId => noteId(base36(8));
export const newFileId = (): FileId => fileId(base36(8));
export const newDrawingId = (): DrawingId => drawingId(base36(8));
export const newChatId = (): ChatId => chatId(base36(8));
export const viewInstance = (s: string): ViewInstance => s as ViewInstance;
/* Six of them for a view's instance, in the same shape its key form reads back. */
export const newViewInstance = (): ViewInstance => viewInstance(Math.random().toString(36).slice(2, 8).padEnd(6, '0'));

export type DocKind = 'text';
/* The companion views, in the order the rail draws their buttons. Three of them
   may stand in the left sidebar as well as in a group — the explorer, which is
   the whole tree, the search, which reads every book of the library, the
   annotations, and the pomodoro clock, which keeps the reader's sittings — and
   the rest are only ever opened as tabs. Exercises comes
   immediately before the concept map, since practice is the map's other face:
   the map says what the book teaches, and the exercises say how much of it the
   reader has made their own. */
export const VIEW_KINDS = ['explorer', 'search', 'exercises', 'concepts', 'formulas', 'definitions', 'annotations', 'pomodoro', 'pomodoro-stats', 'colours'] as const;
export type ViewKind = (typeof VIEW_KINDS)[number];
export const SIDEBAR_KINDS = ['explorer', 'search', 'annotations', 'pomodoro'] as const;
export type SidebarKind = (typeof SIDEBAR_KINDS)[number];
export const isSidebarKind = (kind: ViewKind): kind is SidebarKind => (SIDEBAR_KINDS as readonly string[]).includes(kind);
/* The views the rail draws no button for, because they are asked for from
   somewhere else: the colour menu is one page the reader opens from the command
   palette when they want to change a colour, and the pomodoro stats are opened
   from the clock's own panel, which is the only place they mean anything. */
export const PALETTE_ONLY_KINDS = ['pomodoro-stats', 'colours'] as const;
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
  | { readonly kind: 'sheet'; readonly sheet: SheetId }   /* one of the book's reference sheets, drawn by the app from the sheet's data */
  | { readonly kind: 'file'; readonly file: FileId }      /* a file the reader imported: a PDF read in the tab, or an image shown in it */
  | { readonly kind: 'drawing'; readonly drawing: DrawingId }
  | { readonly kind: 'chat'; readonly chat: ChatId }
  | { readonly kind: 'ex'; readonly section: SectionId; readonly ex: string };   /* ex: the exercise's local id within its section, e.g. p3 or cq1 */

export const docItem = (section: SectionId, doc: DocKind): ItemId => ({ kind: 'doc', section, doc });
export const viewItem = (view: ViewKind, instance?: ViewInstance): ItemId => (instance ? { kind: 'view', view, instance } : { kind: 'view', view });
/* A page of a view of its own, which is what the rail opens: every click is another one. */
export const newViewItem = (view: ViewKind): ItemId => viewItem(view, newViewInstance());
export const figItem = (section: SectionId, fig: string): ItemId => ({ kind: 'fig', section, fig });
export const pageItem = (page: PageKind): ItemId => ({ kind: 'page', page });
export const noteItem = (note: NoteId): ItemId => ({ kind: 'note', note });
export const sheetItem = (sheet: SheetId): ItemId => ({ kind: 'sheet', sheet });
export const fileItem = (file: FileId): ItemId => ({ kind: 'file', file });
export const drawingItem = (drawing: DrawingId): ItemId => ({ kind: 'drawing', drawing });
export const chatItem = (chat: ChatId): ItemId => ({ kind: 'chat', chat });
export const exItem = (section: SectionId, ex: string): ItemId => ({ kind: 'ex', section, ex });
/* Documents, figures and exercises belong to a section; a view describes a
   scope of its own, and a page and everything the reader owns belong to no
   section at all. */
export const sectionOfItem = (id: ItemId): SectionId | null =>
  (id.kind === 'doc' || id.kind === 'fig' || id.kind === 'ex' ? id.section : null);

/* The string form is what layouts persist and what the DOM carries in data attributes. */
export const itemKey = (id: ItemId): string => {
  switch (id.kind) {
    case 'doc': return `doc:${id.section}/${id.doc}`;
    case 'fig': return `fig:${id.section}/${id.fig}`;
    case 'ex': return `ex:${id.section}/${id.ex}`;
    case 'page': return `page:${id.page}`;
    case 'note': return `note:${id.note}`;
    case 'sheet': return `sheet:${id.sheet}`;
    case 'file': return `file:${id.file}`;
    case 'drawing': return `drawing:${id.drawing}`;
    case 'chat': return `chat:${id.chat}`;
    default: return id.instance ? `view:${id.view}@${id.instance}` : `view:${id.view}`;
  }
};
export const parseItemKey = (s: string): ItemId | null => {
  const view = /^view:([\w-]+)(?:@([a-z0-9]{6}))?$/.exec(s);
  if (view) return (VIEW_KINDS as readonly string[]).includes(view[1]) ? viewItem(view[1] as ViewKind, view[2] ? viewInstance(view[2]) : undefined) : null;
  const page = /^page:(\w+)$/.exec(s);
  if (page) return (PAGE_KINDS as readonly string[]).includes(page[1]) ? pageItem(page[1] as PageKind) : null;
  const note = /^note:([a-z0-9]{8})$/.exec(s);
  if (note) return noteItem(noteId(note[1]));
  const sheet = /^sheet:([\w.-]+)$/.exec(s);
  if (sheet) return sheetItem(sheetId(sheet[1]));
  /* The three things the reader owns are all named by eight of base 36. */
  const file = /^file:([a-z0-9]{8})$/.exec(s);
  if (file) return fileItem(fileId(file[1]));
  const drawing = /^drawing:([a-z0-9]{8})$/.exec(s);
  if (drawing) return drawingItem(drawingId(drawing[1]));
  const chat = /^chat:([a-z0-9]{8})$/.exec(s);
  if (chat) return chatItem(chatId(chat[1]));
  const ex = /^ex:([^/]+)\/([\w-]+)$/.exec(s);
  if (ex) return exItem(sectionId(ex[1]), ex[2]);
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
