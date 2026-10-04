/* The live colours of every book in use: what the reader has chosen, the
   stylesheet it makes, and a timeline of their own. Choosing a colour is not an edit of the
   reader's notes, so it does not belong on the shell's timeline; it has a stack
   here instead, walked by the buttons on the Colours page, by two commands, and
   by Ctrl+Z inside the page. Each book is remembered in this browser under its
   own id, as the very document the reader exports to a file, and the Colours
   page edits one book at a time, the selected one. */
import { FIG, setReferentSource } from '../fig/figlib';
import { settings } from '../settings/store.svelte';
import { type Edit, type Stack, breakCoalescing, canRedo, canUndo, coalesce, emptyStack, push, redo, redoLabel, undo, undoLabel } from '../history/model';
import type { BookManifest } from '../content/schema';
import { type BookId, bookId } from '../types/ids';
import { DEFAULT_VISION, OKLAB, type Offer, type Palette, type PaletteId, pairsOf } from './palettes';
import { assignInOrder, assignSmart } from './assign';
import { fixedOf, pagesOfBook } from './counts';
import {
  type Choices, type ColourFileDTO, type Hex, type Hue, type Place, type Scheme, type Source, type TypeKey,
  NO_CHOICES, applyHues, clearHue, clearPlace, cssFor, effectiveHue, fromFile, hueFrom, isEmpty, moveType, orderOf,
  type PageReferents, ownHue, pageReferents, referentOrder, referentsOf, schemeOf, setHue, setReferents, setVision, toFile, visionOf,
} from './model';
import { type RefMode, type RefSettings, clampTarget, referentPalettes, targetOf } from './referents';
import type { DeltaE, Vision } from './oklab';
import { readerWritesAllowed } from '../backup/guard';
import { bookColoursHref } from './rules';

const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const remove = (key: string): void => { if (!readerWritesAllowed()) return; try { localStorage.removeItem(key); } catch { /* private mode */ } };

/* What a step of the timeline is called. The book's voice, and short enough to
   sit in a button's title: "velocity in section 16.3". A type whose label names
   several things ("position, displacement") is called by the first of them. */
const nameOf = (m: BookManifest | null, type: TypeKey): string => (m?.types[type]?.label ?? type).split(',')[0].trim();
const whereIn = (p: Place): string => (p.level === 'book' ? 'in the book' : p.level === 'chapter' ? `in chapter ${p.chapter}` : `in section ${p.section}`);
const whereFor = (p: Place): string => (p.level === 'book' ? 'for the book' : p.level === 'chapter' ? `for chapter ${p.chapter}` : `for section ${p.section}`);
const whereOf = (p: Place): string => (p.level === 'book' ? 'the book' : p.level === 'chapter' ? `chapter ${p.chapter}` : `section ${p.section}`);

/* Nothing is known about a book until its manifest arrives, and a page may read
   the scheme before then, so the ring standing over no quantities at all is
   what a store without a manifest answers with. */
const NO_SCHEME: Scheme = { palette: OKLAB, hues: {} };

/* One book's colours: its manifest, what the reader chose, and its own timeline. */
type BookColours = { readonly manifest: BookManifest; readonly choices: Choices; readonly stack: Stack };
const keyOf = (book: BookId): string => `omnistax-colours-${book}`;
/* What this browser holds for a book, and no choices at all when it holds
   nothing, holds something else, or holds what an older version of the app
   wrote before the file had an envelope round it. */
const stored = (book: BookId): Choices => {
  try {
    const got = fromFile(JSON.parse(read(keyOf(book)) ?? 'null'), book);
    return got.ok ? got.choices : NO_CHOICES;
  } catch { return NO_CHOICES; }
};

/* The head carries one stylesheet link and one style of the reader's choices per book in use. */
const hasRules = (book: BookId): boolean =>
  document.head.querySelector(`link[data-book-rules="${book}"]`) !== null
  || [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].some((l) => l.getAttribute('href') === bookColoursHref(book));
const linkRules = (book: BookId): void => {
  if (hasRules(book)) return;
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: bookColoursHref(book) });
  link.dataset.bookRules = book;
  document.head.appendChild(link);
};
const styleOf = (book: BookId): HTMLStyleElement => {
  const got = document.head.querySelector<HTMLStyleElement>(`style[data-colours="${book}"]`);
  if (got) return got;
  const el = document.createElement('style'); el.dataset.colours = book;
  return document.head.appendChild(el);
};

class Colours {
  private books = $state.raw<Readonly<Record<BookId, BookColours>>>({});
  private book = $state.raw<BookId>(bookId(''));
  /* The vision the reader has stated on the Colours page, which the palettes there
     are worked out for, and which the page takes on only when a palette is applied. */
  private stated = $state.raw<Readonly<Record<BookId, Vision>>>({});
  /* True while a step of this timeline is running, so that walking it never
     writes another step. */
  private applying = false;

  /* A book the page shows: its rules linked once, what was saved for it brought
     back and written into its own style. */
  ensureBook(manifest: BookManifest): void {
    const book = manifest.id;
    if (this.books[book]) return;
    this.books = { ...this.books, [book]: { manifest, choices: stored(book), stack: emptyStack() } };
    if (typeof document === 'undefined') return;
    linkRules(book);
    this.applyCss(book);
    FIG.redrawAll();
  }
  /* The book the Colours page and the timeline commands work on. */
  select(book: BookId): void { this.book = book; }
  get selected(): BookId { return this.book; }
  init(manifest: BookManifest): void { this.ensureBook(manifest); this.select(manifest.id); }

  choicesOf(book: BookId): Choices { return this.books[book]?.choices ?? NO_CHOICES; }
  schemeOf(book: BookId): Scheme { const b = this.books[book]; return b ? schemeOf(b.manifest, b.choices) : NO_SCHEME; }

  private get cur(): BookColours | undefined { return this.books[this.book]; }
  private get manifest(): BookManifest | null { return this.cur?.manifest ?? null; }
  private get stack(): Stack { return this.cur?.stack ?? emptyStack(); }
  get choices(): Choices { return this.choicesOf(this.book); }

  /* The colours the book wears under everything the reader has set, and the
     quantities in the order they have put them in. */
  get scheme(): Scheme { return this.schemeOf(this.book); }
  get order(): readonly TypeKey[] { return this.manifest ? orderOf(this.manifest, this.choices) : []; }
  hueAt(type: TypeKey, place: Place): { readonly hue: Hue | null; readonly from: Source } {
    return this.manifest ? effectiveHue(this.manifest, this.choices, type, place) : { hue: ownHue(this.choices.overrides, type, place), from: { kind: 'none' } };
  }
  own(type: TypeKey, place: Place): Hue | null { return ownHue(this.choices.overrides, type, place); }

  /* One colour picked while one theme is shown. The slot of the other theme is
     the reader's own if they have already chosen it here, and otherwise the same
     hue carried across. A drag of the colour input arrives as a burst under one
     key and undoes in a single step. */
  pick(place: Place, type: TypeKey, picked: Hex, coalesceKey?: string): void {
    const hue = hueFrom(picked, settings.dark, this.own(type, place));
    this.record(`${nameOf(this.manifest, type)} ${whereIn(place)}`, setHue(this.choices, place, type, hue), coalesceKey);
  }
  set(place: Place, type: TypeKey, hue: Hue): void {
    this.record(`${nameOf(this.manifest, type)} ${whereIn(place)}`, setHue(this.choices, place, type, hue));
  }
  clear(place: Place, type: TypeKey): void {
    this.record(`${nameOf(this.manifest, type)} ${whereIn(place)} cleared`, clearHue(this.choices, place, type));
  }
  clearPlace(place: Place): void {
    this.record(`every color of ${whereOf(place)} cleared`, clearPlace(this.choices, place));
  }
  /* A palette dressed onto the types of a place in one step. The palette is asked
     for exactly as many hues as the place has quantities; one that cannot dress
     that many answers nothing, and the page does not offer it in the first
     place, so this refuses rather than colouring some of them. */
  usePalette(place: Place, types: readonly TypeKey[], palette: Palette): boolean {
    const hues = pairsOf(palette, types.length, this.vision);
    const next = hues ? applyHues(this.choices, place, types, hues) : null;
    if (!next) return false;
    this.record(`the palette ${palette.name} ${whereFor(place)}`, next);
    return true;
  }
  /* One quantity moved in the order the whole book follows. Every palette lays
     its hues along that order, so this recolours whatever still follows the
     scheme and leaves a colour the reader set where it is. */
  move(type: TypeKey, before: TypeKey | null): void {
    if (!this.manifest) return;
    const where = before === null ? 'to the end' : `before ${nameOf(this.manifest, before)}`;
    this.record(`${nameOf(this.manifest, type)} moved ${where}`, moveType(this.manifest, this.choices, type, before));
  }
  /* The colours chosen for each type at once, as assignInOrder or assignSmart hand them back. */
  useAssignment(place: Place, label: string, assignment: ReadonlyMap<TypeKey, Hue>): void {
    const types = [...assignment.keys()];
    const next = applyHues(this.choices, place, types, types.map((k) => assignment.get(k) as Hue));
    if (next) this.record(`${label} ${whereFor(place)}`, next);
  }
  /* A palette laid over every quantity of the book under a stated vision, along the
     reader's order or smartly by what each page shows, and written at a place for
     the quantities that place lists, with the vision, in one step. */
  applyCategories(place: Place, types: readonly TypeKey[], palette: Palette, mode: RefMode, vision: Vision): boolean {
    const m = this.manifest;
    const order = this.order;
    const hues = m ? pairsOf(palette, order.length, vision) : null;
    if (!m || !hues) return false;
    const pages = pagesOfBook(m);
    const got = mode === 'order' ? assignInOrder(order, hues) : assignSmart({ categories: order, colours: hues, pages, fixed: fixedOf(pages), vision, seed: 1 });
    const here = types.filter((k) => got.has(k));
    const next = applyHues(setVision(this.choices, vision), place, here, here.map((k) => got.get(k) as Hue));
    if (!next) return false;
    this.record(`the palette ${palette.name} ${mode === 'smart' ? 'smart' : 'in order'} ${whereFor(place)}`, next);
    return true;
  }
  /* The colour vision the reader reads with, which the palettes are generated for. */
  get vision(): Vision { return this.manifest ? visionOf(this.manifest, this.choices) : this.choices.vision ?? DEFAULT_VISION; }
  get statedVision(): Vision { return this.stated[this.book] ?? this.vision; }
  stateVision(vision: Vision): void { this.stated = { ...this.stated, [this.book]: vision }; }
  setVision(vision: Vision | undefined): void { this.record(`color vision ${vision ?? 'reset'}`, setVision(this.choices, vision)); }
  resetAll(): void { this.record('every color reset', NO_CHOICES); }

  /* The referent palette, how groups deal it out, and the target distance. */
  get referents(): RefSettings { return referentsOf(this.choices); }
  /* Smart first sorts the palette for this book under the reader's colours and vision, and keeps that order
     until they apply again. */
  applyReferents(palette: PaletteId, mode: RefMode, vision: Vision): void {
    const m = this.manifest;
    const seen = setVision(this.choices, vision);
    const { order: _, ...now } = this.referents;
    const order = m && mode === 'smart' ? { order: referentOrder(m, seen, palette, targetOf(now)) } : {};
    this.record(`referents ${mode === 'smart' ? 'smart' : 'in order'}`, setReferents(seen, { ...now, palette, mode, ...order }));
  }
  /* The target re-deals along the order already kept. A drag of the slider arrives as a burst and undoes in a single step. */
  setReferentTarget(target: DeltaE): void {
    this.record(`referent distance ${target.toFixed(2)}`, setReferents(this.choices, { ...this.referents, target: clampTarget(target) }), 'referent-target');
  }
  /* The palettes that can give the referents their thirty-six under the reader's vision. */
  referentPalettes(vision: Vision = this.vision): readonly Offer[] { return referentPalettes(vision); }
  /* A page's referents with their colours, which figures and the text wear. */
  referentsAt(book: BookId, page: string): PageReferents | null {
    const b = this.books[book];
    return b ? pageReferents(b.manifest, b.choices, page) : null;
  }

  /* The document the reader saves, and the one they hand back. Loading is one
     step of the timeline, so a file opened by mistake is taken back like
     anything else. */
  exportFile(): ColourFileDTO { return toFile(this.book, this.choices); }
  load(raw: unknown): { readonly ok: true } | { readonly ok: false; readonly reason: 'not-colours' | 'other-book' } {
    const got = fromFile(raw, this.book);
    if (!got.ok) return got;
    this.record('colors loaded from a file', got.choices);
    return { ok: true };
  }

  undo(): void { const step = undo(this.stack); this.walk(this.book, step.stack, step.edit, 'undo'); }
  redo(): void { const step = redo(this.stack); this.walk(this.book, step.stack, step.edit, 'redo'); }
  get canUndo(): boolean { return canUndo(this.stack); }
  get canRedo(): boolean { return canRedo(this.stack); }
  get undoLabel(): string { return undoLabel(this.stack); }
  get redoLabel(): string { return redoLabel(this.stack); }
  breakCoalescing(): void { this.setStack(this.book, breakCoalescing(this.stack)); }

  /* A change the reader can take back, on the selected book. The choices are an
     immutable value, so the two sides of a step are simply the value before and
     the value after. */
  private record(label: string, next: Choices, coalesceKey?: string): void {
    const book = this.book, before = this.choices;
    if (this.applying || next === before || !this.cur) return;
    this.apply(book, next);
    const edit: Edit = { label, undo: () => this.apply(book, before), redo: () => this.apply(book, next) };
    this.setStack(book, coalesceKey ? coalesce(this.stack, coalesceKey, edit, Date.now()) : push(this.stack, edit));
  }
  private setStack(book: BookId, stack: Stack): void {
    const b = this.books[book];
    if (b) this.books = { ...this.books, [book]: { ...b, stack } };
  }
  /* The one path a change takes, whether the reader made it or a step of the
     timeline put it back: hold it, save it, write the sheet, repaint. */
  private apply(book: BookId, choices: Choices): void {
    const b = this.books[book];
    if (!b) return;
    this.books = { ...this.books, [book]: { ...b, choices } };
    this.save(book);
    this.applyCss(book);
    FIG.redrawAll();
  }
  /* The stack moves first and the step runs after it, so that anything the step
     stirs up sees the timeline as it now stands. */
  private walk(book: BookId, next: Stack, edit: Edit | null, way: 'undo' | 'redo'): void {
    if (!edit) return;
    this.setStack(book, next);
    this.applying = true;
    try { edit[way](); } finally { this.applying = false; }
  }

  private save(book: BookId): void {
    const c = this.choicesOf(book);
    if (isEmpty(c)) remove(keyOf(book)); else write(keyOf(book), JSON.stringify(toFile(book, c)));
  }
  /* One style element per book carries its scheme and every override over it,
     scoped to the book as its stylesheet is. It is written whole each time, so a
     colour cleared leaves nothing behind. */
  private applyCss(book: BookId): void {
    const b = this.books[book];
    if (typeof document === 'undefined' || !b) return;
    styleOf(book).textContent = cssFor(b.manifest, b.choices);
  }
}
export const colours = new Colours();
setReferentSource((book, page) => colours.referentsAt(bookId(book), page));
