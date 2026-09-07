/* Identifiers used across the shell. Branded strings keep a section id from
   being confused with a group key or a DOM id; ItemId is an ADT because a
   tab can hold two different things. */

export type SectionId = string & { readonly __brand: 'SectionId' };
export type GroupKey = string & { readonly __brand: 'GroupKey' };
export type SpanId = string & { readonly __brand: 'SpanId' };
export type ConceptId = string & { readonly __brand: 'ConceptId' };

export const sectionId = (s: string): SectionId => s as SectionId;
export const groupKey = (s: string): GroupKey => s as GroupKey;
export const spanId = (s: string): SpanId => s as SpanId;
export const conceptId = (s: string): ConceptId => s as ConceptId;
export const newGroupKey = (): GroupKey => groupKey(Math.random().toString(36).slice(2, 8));

export type DocKind = 'text' | 'exercises';
export const VIEW_KINDS = ['concepts', 'contents', 'formulas', 'definitions', 'notes'] as const;
export type ViewKind = (typeof VIEW_KINDS)[number];

export type ItemId =
  | { readonly kind: 'doc'; readonly section: SectionId; readonly doc: DocKind }
  | { readonly kind: 'view'; readonly view: ViewKind };

export const docItem = (section: SectionId, doc: DocKind): ItemId => ({ kind: 'doc', section, doc });
export const viewItem = (view: ViewKind): ItemId => ({ kind: 'view', view });

/* The string form is what layouts persist and what the DOM carries in data attributes. */
export const itemKey = (id: ItemId): string => (id.kind === 'doc' ? `doc:${id.section}/${id.doc}` : `view:${id.view}`);
export const parseItemKey = (s: string): ItemId | null => {
  const view = /^view:(\w+)$/.exec(s);
  if (view) return (VIEW_KINDS as readonly string[]).includes(view[1]) ? viewItem(view[1] as ViewKind) : null;
  const doc = /^doc:([^/]+)\/(text|exercises)$/.exec(s);
  return doc ? docItem(sectionId(doc[1]), doc[2] as DocKind) : null;
};
export const sameItem = (a: ItemId, b: ItemId): boolean => itemKey(a) === itemKey(b);
export const isView = (id: ItemId): id is Extract<ItemId, { kind: 'view' }> => id.kind === 'view';

/* DOM ids inside a section are qualified by the section at build time: "2.1-displacement". */
export const qualifiedId = (section: SectionId, local: string): SpanId => spanId(`${section}-${local}`);
export const exerciseDomId = (section: SectionId, exerciseId: string): SpanId => spanId(`${section}-ex-${exerciseId}`);
export const sectionOfSpan = (id: SpanId): SectionId => sectionId(id.split('-')[0]);
