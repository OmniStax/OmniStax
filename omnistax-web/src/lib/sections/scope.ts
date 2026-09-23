/* What a companion view describes. A view is no longer tied to one section: it
   stands at a level of the book — the whole book, one chapter, or one section —
   and at that level it either follows the reader or is pinned to a place of its
   own. Widening and narrowing walk the levels and keep the pin, so a view
   pinned to 16.3 widens to a view pinned to chapter 16 rather than letting go.
   Everything here is pure: a scope is read against the focused section and the
   tree of the book it stands in, and the store applies these functions and
   persists the result. A target names its book; a following view stands in the
   book of the section being read. */
import { type BookId, type ChapterId, type SectionId, type SectionRef, type ViewKind, VIEW_KINDS, bookId, chapterId, itemKey, sectionId, viewItem } from '../types/ids';
import type { BookTree } from '../commands/browser';
import { pagesOf } from '../content/roles';

export type Level = 'book' | 'chapter' | 'section';
export const LEVELS: readonly Level[] = ['book', 'chapter', 'section'];   /* wider first */

/* Where a view is pointed once any following has been resolved. */
export type Target =
  | { readonly level: 'book'; readonly book: BookId }
  | { readonly level: 'chapter'; readonly book: BookId; readonly chapter: ChapterId }
  | { readonly level: 'section'; readonly book: BookId; readonly section: SectionId };
export type ViewScope =
  | { readonly follow: true; readonly level: Level }
  | { readonly follow: false; readonly target: Target };
/* One step of the trail to a target: the book, its chapter, its section, each named
   twice — short for a button, long for its title — and each a place to send the view. */
export type Crumb = { readonly level: Level; readonly short: string; readonly long: string; readonly target: Target };
/* One entry of a crumb's menu: a chapter of the book, or a section of one chapter,
   named the way the book names it and told whether anything of it has been built. */
export type Sibling = { readonly target: Target; readonly id: string; readonly title: string; readonly built: boolean };

const bookAt = (book: BookId): Target => ({ level: 'book', book });
export const FOLLOW_SECTION: ViewScope = { follow: true, level: 'section' };

const isLevel = (v: unknown): v is Level => (LEVELS as readonly unknown[]).includes(v);
const chapterNode = (tree: BookTree, id: ChapterId) => tree.chapters.find((c) => c.id === id);
const firstBuilt = (tree: BookTree, id: ChapterId): SectionId | null => { const s = chapterNode(tree, id)?.sections.find((x) => x.built); return s ? sectionId(s.id) : null; };
const named = (id: string, title: string): string => `${id} ${title}`;

/* The chapter a page lies in, its introduction and summary counted with its sections, so a view following the reader into a chapter's opening page describes that chapter. */
export const chapterOf = (tree: BookTree, section: SectionId): ChapterId | null => { const c = tree.chapters.find((x) => pagesOf(x).some((s) => s.id === section)); return c ? chapterId(c.id) : null; };
export const levelOf = (scope: ViewScope): Level => (scope.follow ? scope.level : scope.target.level);
/* The book a scope stands in, whose tree the functions below are handed. */
export const bookOfScope = (scope: ViewScope, focused: SectionRef): BookId => (scope.follow ? focused.book : scope.target.book);

/* A following view reads as the place around the focused section at its level; a
   section the book does not know belongs to no chapter, so chapter level falls back to the book. */
export const resolve = (scope: ViewScope, focused: SectionRef, tree: BookTree): Target => {
  if (!scope.follow) return scope.target;
  if (scope.level === 'section') return { level: 'section', book: focused.book, section: focused.section };
  if (scope.level === 'book') return bookAt(focused.book);
  const chapter = tree.id === focused.book ? chapterOf(tree, focused.section) : null;
  return chapter ? { level: 'chapter', book: focused.book, chapter } : bookAt(focused.book);
};

/* One level out, stopping at the book. A pin survives the step and keeps its book:
   a pinned section widens to a pin on its chapter, and a pinned chapter to a pin on
   its book. */
export const widen = (scope: ViewScope, tree: BookTree): ViewScope => {
  if (scope.follow) return scope.level === 'book' ? scope : { follow: true, level: scope.level === 'section' ? 'chapter' : 'book' };
  const { book } = scope.target;
  if (scope.target.level === 'book') return scope;
  if (scope.target.level === 'chapter') return { follow: false, target: bookAt(book) };
  const chapter = chapterOf(tree, scope.target.section);
  return { follow: false, target: chapter ? { level: 'chapter', book, chapter } : bookAt(book) };
};

/* One level in, stopping at a section. Following narrows to following; a pinned
   book narrows to a pinned chapter and a pinned chapter to a pinned section — the
   one being read when it lies there, else the first that has something built. */
export const narrow = (scope: ViewScope, focused: SectionRef, tree: BookTree): ViewScope => {
  if (scope.follow) return scope.level === 'section' ? scope : { follow: true, level: scope.level === 'book' ? 'chapter' : 'section' };
  if (scope.target.level === 'section') return scope;
  if (scope.target.level === 'book') {
    const book = scope.target.book;
    const here = focused.book === book ? chapterOf(tree, focused.section) : null;
    const c = here ?? tree.chapters.find((x) => x.sections.some((s) => s.built))?.id;
    return c ? { follow: false, target: { level: 'chapter', book, chapter: chapterId(c) } } : scope;
  }
  const { book, chapter } = scope.target;
  const section = focused.book === book && chapterOf(tree, focused.section) === chapter ? focused.section : firstBuilt(tree, chapter);
  return section ? { follow: false, target: { level: 'section', book, section } } : scope;
};

/* Widen or narrow until the level asked for is reached, or until a step stops moving. */
export const atLevel = (scope: ViewScope, level: Level, focused: SectionRef, tree: BookTree): ViewScope => {
  const here = LEVELS.indexOf(levelOf(scope)), want = LEVELS.indexOf(level);
  if (here === want) return scope;
  const next = here > want ? widen(scope, tree) : narrow(scope, focused, tree);
  return levelOf(next) === levelOf(scope) ? scope : atLevel(next, level, focused, tree);
};

/* The built sections a target covers, in book order; a section target is itself. */
export const sectionsOf = (target: Target, tree: BookTree): readonly SectionId[] => {
  if (target.level === 'section') return [target.section];
  const chapters = target.level === 'book' ? tree.chapters : tree.chapters.filter((c) => c.id === target.chapter);
  return chapters.flatMap((c) => c.sections.filter((s) => s.built).map((s) => sectionId(s.id)));
};

/* The book, its chapter, its section: the three places a view can stand. A target
   above the section names the places narrowing would land on, so the trail the reader
   clicks is the trail the level buttons walk; a book too small to have them says less. */
export const crumbsOf = (target: Target, tree: BookTree): readonly Crumb[] => {
  const book: Crumb = { level: 'book', short: 'Book', long: tree.title, target: bookAt(tree.id) };
  const section = target.level === 'section' ? target.section : null;
  const id = target.level === 'chapter' ? target.chapter : section ? chapterOf(tree, section) : tree.chapters.length > 0 ? chapterId(tree.chapters[0].id) : null;
  if (!id) return [book];
  const c = chapterNode(tree, id);
  const chapter: Crumb = { level: 'chapter', short: `Ch ${id}`, long: c ? named(c.id, c.title) : id, target: { level: 'chapter', book: tree.id, chapter: id } };
  const sec = section ?? firstBuilt(tree, id);
  if (!sec) return [book, chapter];
  const s = c?.sections.find((x) => x.id === sec);
  return [book, chapter, { level: 'section', short: sec, long: s ? named(s.id, s.title) : sec, target: { level: 'section', book: tree.id, section: sec } }];
};

/* What a button naming the target reads: its own step of the trail. */
export const targetLabel = (target: Target, tree: BookTree): string => crumbsOf(target, tree).find((c) => c.level === target.level)?.short ?? 'Book';
export const sameTarget = (a: Target, b: Target): boolean =>
  a.book === b.book && (a.level === 'book' ? b.level === 'book' : a.level === 'chapter' ? b.level === 'chapter' && a.chapter === b.chapter : b.level === 'section' && a.section === b.section);

/* Picking a place at a level: the place a following view would land on there means
   following again, since that is what the reader is asking for, and any other place is
   a pin. A choice carries its own level, so choosing also walks the view to it. */
export const choose = (target: Target, focused: SectionRef, tree: BookTree): ViewScope =>
  sameTarget(target, resolve({ follow: true, level: target.level }, focused, tree)) ? { follow: true, level: target.level } : { follow: false, target };

/* The chapter a target lies in, and for the book the first one, which is where the trail runs. */
const anchorChapter = (anchor: Target, tree: BookTree): ChapterId | null =>
  anchor.level === 'chapter' ? anchor.chapter : anchor.level === 'section' ? chapterOf(tree, anchor.section) : tree.chapters.length > 0 ? chapterId(tree.chapters[0].id) : null;
/* The places one crumb's menu offers: every chapter of the book, or every section of the
   chapter the trail runs through — which the anchor, the deepest crumb's target, names. */
export const siblingsOf = (level: 'chapter' | 'section', anchor: Target, tree: BookTree): readonly Sibling[] => {
  if (level === 'chapter') return tree.chapters.map((c) => ({ target: { level: 'chapter', book: tree.id, chapter: chapterId(c.id) }, id: c.id, title: c.title, built: c.sections.some((s) => s.built) }));
  const id = anchorChapter(anchor, tree);
  return (id ? chapterNode(tree, id)?.sections ?? [] : []).map((s) => ({ target: { level: 'section', book: tree.id, section: sectionId(s.id) }, id: s.id, title: s.title, built: s.built }));
};

/* The chapter or the section before or after the one the view stands on, taken as the menu
   takes it. Chapters step through every chapter the book lists; sections step through the
   built sections of the whole book, so the step runs on past a chapter's end. The book has
   no siblings, and both ends hold. */
export const stepSibling = (scope: ViewScope, dir: 1 | -1, focused: SectionRef, tree: BookTree): ViewScope => {
  const target = resolve(scope, focused, tree);
  if (target.level === 'book') return scope;
  const places: readonly Target[] = target.level === 'chapter'
    ? tree.chapters.map((c): Target => ({ level: 'chapter', book: tree.id, chapter: chapterId(c.id) }))
    : sectionsOf(bookAt(tree.id), tree).map((s): Target => ({ level: 'section', book: tree.id, section: s }));
  const at = places.findIndex((p) => sameTarget(p, target));
  const next = at < 0 ? undefined : places[at + dir];
  return next ? choose(next, focused, tree) : scope;
};

/* The boundary with storage, where anything may come back: the shape written here,
   or the bare section id a per-kind pin used to be. A pin on the book is no pin at
   all, so it comes back as following the book. A pin written before targets named
   their book is of `boot`, the only book there was. */
const bookOr = (raw: unknown, boot: BookId): BookId => (typeof raw === 'string' && raw !== '' ? bookId(raw) : boot);
export const UNKNOWN: BookId = bookId('');
/* A pin read without its book, given the one it belongs to. */
export const inBook = (scope: ViewScope, boot: BookId): ViewScope =>
  scope.follow || scope.target.book !== UNKNOWN ? scope : { follow: false, target: { ...scope.target, book: boot } };
export const parseScope = (raw: unknown, boot: BookId): ViewScope | null => {
  if (typeof raw === 'string') return raw ? { follow: false, target: { level: 'section', book: boot, section: sectionId(raw) } } : null;
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as { follow?: unknown; level?: unknown; target?: unknown };
  if (o.follow === true) return isLevel(o.level) ? { follow: true, level: o.level } : null;
  if (o.follow !== false || typeof o.target !== 'object' || o.target === null) return null;
  const t = o.target as { level?: unknown; book?: unknown; chapter?: unknown; section?: unknown };
  const book = bookOr(t.book, boot);
  if (t.level === 'book') return typeof t.book === 'string' && t.book !== '' ? { follow: false, target: bookAt(book) } : { follow: true, level: 'book' };
  if (t.level === 'chapter') return typeof t.chapter === 'string' && t.chapter !== '' ? { follow: false, target: { level: 'chapter', book, chapter: chapterId(t.chapter) } } : null;
  if (t.level === 'section') return typeof t.section === 'string' && t.section !== '' ? { follow: false, target: { level: 'section', book, section: sectionId(t.section) } } : null;
  return null;
};

/* The whole table as storage holds it: where every page of a view stands, keyed by
   the item key of the tab it is. An entry written against a bare kind — as every
   entry was before a view could be opened twice — belongs to that kind's singleton,
   and an entry that does not read as a scope is left out. */
export type Scopes = Readonly<Record<string, ViewScope>>;
const scopeKey = (k: string): string => ((VIEW_KINDS as readonly string[]).includes(k) ? itemKey(viewItem(k as ViewKind)) : k);
export const parseScopes = (raw: unknown, boot: BookId): Scopes =>
  typeof raw !== 'object' || raw === null ? {}
    : Object.fromEntries(Object.entries(raw as Record<string, unknown>).flatMap(([k, v]) => { const s = parseScope(v, boot); return s ? [[scopeKey(k), s]] : []; }));
/* Where one page stands: what was saved for it, and the section being read for a page
   nothing was saved for — a view opens following the page it was opened beside. */
export const scopeAt = (scopes: Scopes, key: string): ViewScope => scopes[key] ?? FOLLOW_SECTION;
