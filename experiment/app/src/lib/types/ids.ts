/* Identifiers used across the shell. Branded strings keep a section id from
   being confused with a chapter id, a group key or a DOM id; ItemId is an ADT
   because a tab can hold four different things: a document, a view, one figure
   split out of a document, or one exercise on its own. */

export type SectionId = string & { readonly __brand: 'SectionId' };
export type ChapterId = string & { readonly __brand: 'ChapterId' };
export type GroupKey = string & { readonly __brand: 'GroupKey' };
export type SpanId = string & { readonly __brand: 'SpanId' };
export type ConceptId = string & { readonly __brand: 'ConceptId' };

export const sectionId = (s: string): SectionId => s as SectionId;
export const chapterId = (s: string): ChapterId => s as ChapterId;
export const groupKey = (s: string): GroupKey => s as GroupKey;
export const spanId = (s: string): SpanId => s as SpanId;
export const conceptId = (s: string): ConceptId => s as ConceptId;
export const newGroupKey = (): GroupKey => groupKey(Math.random().toString(36).slice(2, 8));

export type DocKind = 'text' | 'exercises';
export const VIEW_KINDS = ['concepts', 'contents', 'formulas', 'definitions', 'notes'] as const;
export type ViewKind = (typeof VIEW_KINDS)[number];

export type ItemId =
  | { readonly kind: 'doc'; readonly section: SectionId; readonly doc: DocKind }
  | { readonly kind: 'view'; readonly view: ViewKind }
  | { readonly kind: 'fig'; readonly section: SectionId; readonly fig: string }    /* fig: the figure's local id, e.g. demo-plane */
  | { readonly kind: 'ex'; readonly section: SectionId; readonly ex: string };     /* ex: the exercise's local id, e.g. cq1 */

export const docItem = (section: SectionId, doc: DocKind): ItemId => ({ kind: 'doc', section, doc });
export const viewItem = (view: ViewKind): ItemId => ({ kind: 'view', view });
export const figItem = (section: SectionId, fig: string): ItemId => ({ kind: 'fig', section, fig });
export const exItem = (section: SectionId, ex: string): ItemId => ({ kind: 'ex', section, ex });
/* Documents, figures and exercises belong to a section; a view describes a scope of its own. */
export const sectionOfItem = (id: ItemId): SectionId | null => (id.kind === 'view' ? null : id.section);

/* The string form is what layouts persist and what the DOM carries in data attributes. */
export const itemKey = (id: ItemId): string => (id.kind === 'doc' ? `doc:${id.section}/${id.doc}` : id.kind === 'fig' ? `fig:${id.section}/${id.fig}` : id.kind === 'ex' ? `ex:${id.section}/${id.ex}` : `view:${id.view}`);
export const parseItemKey = (s: string): ItemId | null => {
  const view = /^view:(\w+)$/.exec(s);
  if (view) return (VIEW_KINDS as readonly string[]).includes(view[1]) ? viewItem(view[1] as ViewKind) : null;
  const doc = /^doc:([^/]+)\/(text|exercises)$/.exec(s);
  if (doc) return docItem(sectionId(doc[1]), doc[2] as DocKind);
  const fig = /^fig:([^/]+)\/([\w-]+)$/.exec(s);
  if (fig) return figItem(sectionId(fig[1]), fig[2]);
  const ex = /^ex:([^/]+)\/([\w-]+)$/.exec(s);
  return ex ? exItem(sectionId(ex[1]), ex[2]) : null;
};
export const sameItem = (a: ItemId, b: ItemId): boolean => itemKey(a) === itemKey(b);
export const isView = (id: ItemId): id is Extract<ItemId, { kind: 'view' }> => id.kind === 'view';

/* DOM ids inside a section are qualified by the section at build time: "2.1-displacement". */
export const qualifiedId = (section: SectionId, local: string): SpanId => spanId(`${section}-${local}`);
export const exerciseDomId = (section: SectionId, exerciseId: string): SpanId => spanId(`${section}-ex-${exerciseId}`);
export const sectionOfSpan = (id: SpanId): SectionId => sectionId(id.split('-')[0]);
