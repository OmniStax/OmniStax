/* The live colours of the book: the reader's own overrides, the stylesheet they
   make, and a timeline of their own. Choosing a colour is not an edit of the
   reader's notes, so it does not belong on the shell's timeline; it has a stack
   here instead, walked by the buttons on the Colours page, by two commands, and
   by Ctrl+Z inside the page. Everything is remembered in this browser under the
   book's id. */
import { FIG } from '../fig/figlib';
import { settings } from '../settings/store.svelte';
import { type Edit, type Stack, breakCoalescing, canRedo, canUndo, coalesce, emptyStack, push, redo, redoLabel, undo, undoLabel } from '../history/model';
import type { BookManifest } from '../content/schema';
import type { Palette } from './palettes';
import {
  EMPTY, type Hex, type Hue, type Overrides, type Place, type Source, type TypeKey,
  applyPalette, clearHue, clearPlace, cssFor, effectiveHue, hueFrom, isEmpty, ownHue, parseOverrides, setHue,
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

class Colours {
  overrides = $state.raw<Overrides>(EMPTY);
  private manifest: BookManifest | null = null;
  private key = 'omnistax-colours';
  private stack = $state.raw<Stack>(emptyStack());
  /* True while a step of this timeline is running, so that walking it never
     writes another step. */
  private applying = false;

  /* The shell calls this once on mount: what was saved comes back, the sheet is
     hung in the head, and every figure repaints with the colours it holds. */
  init(manifest: BookManifest): void {
    this.manifest = manifest;
    this.key = `omnistax-colours-${manifest.id}`;
    try { this.overrides = parseOverrides(JSON.parse(read(this.key) ?? 'null')); } catch { this.overrides = EMPTY; }
    this.applyCss();
    FIG.redrawAll();
  }

  hueAt(type: TypeKey, place: Place): { readonly hue: Hue | null; readonly from: Source } {
    return this.manifest ? effectiveHue(this.overrides, this.manifest, type, place) : { hue: ownHue(this.overrides, type, place), from: 'none' };
  }
  own(type: TypeKey, place: Place): Hue | null { return ownHue(this.overrides, type, place); }

  /* One colour picked while one theme is shown. The slot of the other theme is
     the reader's own if they have already chosen it here, and otherwise the same
     hue carried across. A drag of the colour input arrives as a burst under one
     key and undoes in a single step. */
  pick(place: Place, type: TypeKey, picked: Hex, coalesceKey?: string): void {
    const hue = hueFrom(picked, settings.dark, ownHue(this.overrides, type, place));
    this.record(`${nameOf(this.manifest, type)} ${whereIn(place)}`, setHue(this.overrides, place, type, hue), coalesceKey);
  }
  set(place: Place, type: TypeKey, hue: Hue): void {
    this.record(`${nameOf(this.manifest, type)} ${whereIn(place)}`, setHue(this.overrides, place, type, hue));
  }
  clear(place: Place, type: TypeKey): void {
    this.record(`${nameOf(this.manifest, type)} ${whereIn(place)} cleared`, clearHue(this.overrides, place, type));
  }
  clearPlace(place: Place): void {
    this.record(`every colour of ${whereOf(place)} cleared`, clearPlace(this.overrides, place));
  }
  /* A palette dressed onto the types of a place in one step. The palette is asked
     for exactly as many hues as the place has quantities; one that cannot dress
     that many answers nothing, and the page does not offer it in the first
     place, so this refuses rather than colouring some of them. */
  usePalette(place: Place, types: readonly TypeKey[], palette: Palette): boolean {
    const hues = palette.huesFor(types.length);
    const next = hues ? applyPalette(this.overrides, place, types, hues) : null;
    if (!next) return false;
    this.record(`the palette ${palette.name} ${whereFor(place)}`, next);
    return true;
  }
  resetAll(): void { this.record('every colour reset', EMPTY); }

  undo(): void { const step = undo(this.stack); this.walk(step.stack, step.edit, 'undo'); }
  redo(): void { const step = redo(this.stack); this.walk(step.stack, step.edit, 'redo'); }
  get canUndo(): boolean { return canUndo(this.stack); }
  get canRedo(): boolean { return canRedo(this.stack); }
  get undoLabel(): string { return undoLabel(this.stack); }
  get redoLabel(): string { return redoLabel(this.stack); }
  breakCoalescing(): void { this.stack = breakCoalescing(this.stack); }

  /* A change the reader can take back. The overrides are an immutable value, so
     the two sides of a step are simply the value before and the value after. */
  private record(label: string, next: Overrides, coalesceKey?: string): void {
    const before = this.overrides;
    if (this.applying || next === before) return;
    this.apply(next);
    const edit: Edit = { label, undo: () => this.apply(before), redo: () => this.apply(next) };
    this.stack = coalesceKey ? coalesce(this.stack, coalesceKey, edit, Date.now()) : push(this.stack, edit);
  }
  /* The one path a change takes, whether the reader made it or a step of the
     timeline put it back: hold it, save it, write the sheet, repaint. */
  private apply(o: Overrides): void {
    this.overrides = o;
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
    if (isEmpty(this.overrides)) remove(this.key); else write(this.key, JSON.stringify(this.overrides));
  }
  /* One style element in the head carries every override. It is written whole
     each time, so a colour cleared leaves nothing behind. */
  private applyCss(): void {
    if (typeof document === 'undefined' || !this.manifest) return;
    const css = cssFor(this.overrides, this.manifest);
    const el = document.getElementById(STYLE_ID) ?? document.head.appendChild(Object.assign(document.createElement('style'), { id: STYLE_ID }));
    el.textContent = css;
  }
}
export const colours = new Colours();
