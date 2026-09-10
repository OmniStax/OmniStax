/* The live colours of the book: what the reader has chosen, the stylesheet it
   makes, and a timeline of their own. Choosing a colour is not an edit of the
   reader's notes, so it does not belong on the shell's timeline; it has a stack
   here instead, walked by the buttons on the Colours page, by two commands, and
   by Ctrl+Z inside the page. Everything is remembered in this browser under the
   book's id, as the very document the reader exports to a file. */
import { FIG } from '../fig/figlib';
import { settings } from '../settings/store.svelte';
import { type Edit, type Stack, breakCoalescing, canRedo, canUndo, coalesce, emptyStack, push, redo, redoLabel, undo, undoLabel } from '../history/model';
import type { BookManifest } from '../content/schema';
import { type BookId, bookId } from '../types/ids';
import { OKLCH, type Palette, huesOf } from './palettes';
import {
  type Choices, type ColourFileDTO, type Hex, type Hue, type Place, type Scheme, type Source, type TypeKey,
  NO_CHOICES, applyPalette, clearHue, clearPlace, cssFor, effectiveHue, fromFile, hueFrom, isEmpty, moveType, orderOf,
  ownHue, schemeOf, setHue, toFile,
} from './model';

const STYLE_ID = 'omnistax-colours';
const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const remove = (key: string): void => { try { localStorage.removeItem(key); } catch { /* private mode */ } };

/* What a step of the timeline is called. The book's voice, and short enough to
   sit in a button's title: "velocity in section 16.3". A type whose label names
   several things ("position, displacement") is called by the first of them. */
const nameOf = (m: BookManifest | null, type: TypeKey): string => (m?.types[type]?.label ?? type).split(',')[0].trim();
const whereIn = (p: Place): string => (p.level === 'book' ? 'in the book' : p.level === 'chapter' ? `in chapter ${p.chapter}` : `in section ${p.section}`);
const whereFor = (p: Place): string => (p.level === 'book' ? 'for the book' : p.level === 'chapter' ? `for chapter ${p.chapter}` : `for section ${p.section}`);
const whereOf = (p: Place): string => (p.level === 'book' ? 'the book' : p.level === 'chapter' ? `chapter ${p.chapter}` : `section ${p.section}`);

/* Nothing is known about the book until the shell mounts, and a page may read
   the scheme before then, so the ring standing over no quantities at all is
   what a store without a manifest answers with. */
const NO_SCHEME: Scheme = { palette: OKLCH, hues: {} };

class Colours {
  choices = $state.raw<Choices>(NO_CHOICES);
  private manifest: BookManifest | null = null;
  private book: BookId = bookId('');
  private key = 'omnistax-colours';
  private stack = $state.raw<Stack>(emptyStack());
  /* True while a step of this timeline is running, so that walking it never
     writes another step. */
  private applying = false;

  /* The shell calls this once on mount: what was saved comes back, the sheet is
     hung in the head, and every figure repaints with the colours it holds. */
  init(manifest: BookManifest): void {
    this.manifest = manifest;
    this.book = manifest.id;
    this.key = `omnistax-colours-${manifest.id}`;
    this.choices = this.stored();
    this.applyCss();
    FIG.redrawAll();
  }
  /* What this browser holds for this book, and no choices at all when it holds
     nothing, holds something else, or holds what an older version of the app
     wrote before the file had an envelope round it. */
  private stored(): Choices {
    try {
      const got = fromFile(JSON.parse(read(this.key) ?? 'null'), this.book);
      return got.ok ? got.choices : NO_CHOICES;
    } catch { return NO_CHOICES; }
  }

  /* The colours the book wears under everything the reader has set, and the
     quantities in the order they have put them in. */
  get scheme(): Scheme { return this.manifest ? schemeOf(this.manifest, this.choices) : NO_SCHEME; }
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
    this.record(`every colour of ${whereOf(place)} cleared`, clearPlace(this.choices, place));
  }
  /* A palette dressed onto the types of a place in one step. The palette is asked
     for exactly as many hues as the place has quantities; one that cannot dress
     that many answers nothing, and the page does not offer it in the first
     place, so this refuses rather than colouring some of them. */
  usePalette(place: Place, types: readonly TypeKey[], palette: Palette): boolean {
    const hues = huesOf(palette, types.length);
    const next = hues ? applyPalette(this.choices, place, types, hues) : null;
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
  resetAll(): void { this.record('every colour reset', NO_CHOICES); }

  /* The document the reader saves, and the one they hand back. Loading is one
     step of the timeline, so a file opened by mistake is taken back like
     anything else. */
  exportFile(): ColourFileDTO { return toFile(this.book, this.choices); }
  load(raw: unknown): { readonly ok: true } | { readonly ok: false; readonly reason: 'not-colours' | 'other-book' } {
    const got = fromFile(raw, this.book);
    if (!got.ok) return got;
    this.record('colours loaded from a file', got.choices);
    return { ok: true };
  }

  undo(): void { const step = undo(this.stack); this.walk(step.stack, step.edit, 'undo'); }
  redo(): void { const step = redo(this.stack); this.walk(step.stack, step.edit, 'redo'); }
  get canUndo(): boolean { return canUndo(this.stack); }
  get canRedo(): boolean { return canRedo(this.stack); }
  get undoLabel(): string { return undoLabel(this.stack); }
  get redoLabel(): string { return redoLabel(this.stack); }
  breakCoalescing(): void { this.stack = breakCoalescing(this.stack); }

  /* A change the reader can take back. The choices are an immutable value, so
     the two sides of a step are simply the value before and the value after. */
  private record(label: string, next: Choices, coalesceKey?: string): void {
    const before = this.choices;
    if (this.applying || next === before) return;
    this.apply(next);
    const edit: Edit = { label, undo: () => this.apply(before), redo: () => this.apply(next) };
    this.stack = coalesceKey ? coalesce(this.stack, coalesceKey, edit, Date.now()) : push(this.stack, edit);
  }
  /* The one path a change takes, whether the reader made it or a step of the
     timeline put it back: hold it, save it, write the sheet, repaint. */
  private apply(c: Choices): void {
    this.choices = c;
    this.save();
    this.applyCss();
    FIG.redrawAll();
  }
  /* The stack moves first and the step runs after it, so that anything the step
     stirs up sees the timeline as it now stands. */
  private walk(next: Stack, edit: Edit | null, way: 'undo' | 'redo'): void {
    if (!edit) return;
    this.stack = next;
    this.applying = true;
    try { edit[way](); } finally { this.applying = false; }
  }

  private save(): void {
    if (isEmpty(this.choices)) remove(this.key); else write(this.key, JSON.stringify(this.exportFile()));
  }
  /* One style element in the head carries the scheme and every override over it.
     It is written whole each time, so a colour cleared leaves nothing behind. */
  private applyCss(): void {
    if (typeof document === 'undefined' || !this.manifest) return;
    const css = cssFor(this.manifest, this.choices);
    const el = document.getElementById(STYLE_ID) ?? document.head.appendChild(Object.assign(document.createElement('style'), { id: STYLE_ID }));
    el.textContent = css;
  }
}
export const colours = new Colours();
