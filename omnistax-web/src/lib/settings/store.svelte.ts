/* User settings: the colour switches, theme, animations, exercise view mode, voice,
   whether what can be looked up wears a rule under it, and whether a concept
   map opens with the practice bars drawn on its nodes.
   Each is remembered in this browser and applied to the document as a class or
   attribute. */
import { type ZoomStep, ZOOM_DEFAULT, nearestZoom, zoomBy } from './zoom';
import { readerWritesAllowed } from '../backup/guard';
import { type FontId, DEFAULT_FIGURE_FONT, DEFAULT_BODY_FONT, parseFont, effective } from './fonts';
import { type ColourSwitch, type ColourSwitches, type ColourShown, COLOURS_ON, COLOUR_SWITCHES, shownOf } from '../colours/switches';
export type { FontId } from './fonts';
export type { ZoomStep } from './zoom';
export { ZOOM_STEPS, ZOOM_DEFAULT, zoomLabel, zoomPx } from './zoom';
export type Theme = 'system' | 'light' | 'dark';
export type ExerciseMode = 'all' | 'one';
export type CardOpen = 'hover' | 'click';
export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];
export type Preview = { figureFont?: FontId; bodyFont?: FontId; theme?: Theme };
export const LOCK_GRACE = { min: 3, max: 120 } as const;
export const DEFAULTS = { theme: 'system' as Theme, colours: COLOURS_ON, underlines: true, animations: true, exerciseMode: 'all' as ExerciseMode, voice: false, mapProgress: true, zoom: ZOOM_DEFAULT, zoomKeys: true, swapDragButtons: false, tips: true, cardOpen: 'hover' as CardOpen, lockGrace: 10, figureFont: DEFAULT_FIGURE_FONT, bodyFont: DEFAULT_BODY_FONT } as const;

const KEYS = { theme: 'omnistax-theme', anim: 'omnistax-anim', exmode: 'omnistax-exmode', voice: 'omnistax-voice', underlines: 'omnistax-underlines', mapProgress: 'omnistax-map-progress', zoom: 'omnistax-zoom', zoomKeys: 'omnistax-zoom-keys', swapDrag: 'omnistax-swap-drag', tips: 'omnistax-tips', cardOpen: 'omnistax-card-open', lockGrace: 'omnistax-lock-grace', figureFont: 'omnistax-figure-font', bodyFont: 'omnistax-body-font' } as const;
const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
/* Concepts keeps the key of the one colour-coding switch it grew out of, so a reader who had turned that off finds Concepts off. */
export const COLOUR_KEYS: Readonly<Record<ColourSwitch, string>> = { all: 'omnistax-cc-all', facts: 'omnistax-cc-facts', refs: 'omnistax-cc-refs', concepts: 'omnistax-cc', words: 'omnistax-cc-words' };
const readColours = (): ColourSwitches => Object.fromEntries(COLOUR_SWITCHES.map((k) => [k, read(COLOUR_KEYS[k]) !== '0'])) as Record<ColourSwitch, boolean>;
const write = (key: string, v: string): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const remove = (key: string): void => { if (!readerWritesAllowed()) return; try { localStorage.removeItem(key); } catch { /* private mode */ } };
const sysDark = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
const readTheme = (): Theme => { const t = read(KEYS.theme); return t === 'light' || t === 'dark' ? t : 'system'; };
const readZoom = (): ZoomStep => { const v = Number(read(KEYS.zoom)); return Number.isFinite(v) && v > 0 ? nearestZoom(v) : ZOOM_DEFAULT; };
const clampGrace = (v: number): number => Math.round(Math.min(LOCK_GRACE.max, Math.max(LOCK_GRACE.min, v)));
const readGrace = (): number => { const s = read(KEYS.lockGrace); const v = Number(s); return s !== null && Number.isFinite(v) ? clampGrace(v) : DEFAULTS.lockGrace; };

class Settings {
  colours = $state<ColourSwitches>(readColours());
  theme = $state<Theme>(readTheme());
  animations = $state(read(KEYS.anim) !== '0');
  exerciseMode = $state<ExerciseMode>(read(KEYS.exmode) === 'one' ? 'one' : 'all');
  voice = $state(read(KEYS.voice) === '1');
  /* The dotted rule under a symbol, a glossary term or an example reference,
     which says the card will open on it. Some readers would rather have the
     page clean and hover anyway, so it can be turned off. */
  underlines = $state(read(KEYS.underlines) !== '0');
  /* Where a concept map starts: with the mastery bars on its nodes, or without
     them. Each map keeps its own switch afterwards, so this only says what a
     map that has just opened shows. */
  mapProgress = $state(read(KEYS.mapProgress) !== '0');
  /* How large the app's own text is, and whether Ctrl+= / Ctrl+− / Ctrl+0 are
     the book's keys or the browser's. Off hands the three chords straight back
     to the browser, which zooms the whole page with them as it always did; the
     three commands stay in the palette either way. */
  zoom = $state<ZoomStep>(readZoom());
  zoomKeys = $state(read(KEYS.zoomKeys) !== '0');
  /* Which mouse button drags a card out of a panel. Off — the way the book
     comes — the left button drags and the right one sweeps a selection across
     the words; on, the two trade places, for a reader who would rather keep
     the left button on the text. */
  swapDragButtons = $state(read(KEYS.swapDrag) === '1');
  tips = $state(read(KEYS.tips) !== '0');
  /* Whether a card opens on hover or waits for a click and stays until the
     next click elsewhere. */
  cardOpen = $state<CardOpen>(read(KEYS.cardOpen) === 'click' ? 'click' : 'hover');
  /* Seconds of grace before a focus lock takes hold. */
  lockGrace = $state(readGrace());
  figureFont = $state<FontId>(parseFont(read(KEYS.figureFont), DEFAULT_FIGURE_FONT));
  bodyFont = $state<FontId>(parseFont(read(KEYS.bodyFont), DEFAULT_BODY_FONT));
  /* A choice being tried in the palette: shown on the page, never saved. */
  preview = $state<Preview>({});

  get effectiveTheme(): Theme { return effective(this.preview.theme, this.theme); }
  get effectiveFigureFont(): FontId { return effective(this.preview.figureFont, this.figureFont); }
  get effectiveBodyFont(): FontId { return effective(this.preview.bodyFont, this.bodyFont); }

  get shown(): ColourShown { return shownOf(this.colours); }
  get dark(): boolean { const t = this.effectiveTheme; return t === 'system' ? sysDark() : t === 'dark'; }
  setFigureFont(id: FontId): void { this.figureFont = id; write(KEYS.figureFont, id); }
  setBodyFont(id: FontId): void { this.bodyFont = id; write(KEYS.bodyFont, id); }
  setPreview(p: Partial<Preview>): void { this.preview = { ...this.preview, ...p }; }
  clearPreview(): void { this.preview = {}; }
  setColour(k: ColourSwitch, on: boolean): void { this.colours = { ...this.colours, [k]: on }; write(COLOUR_KEYS[k], on ? '1' : '0'); }
  setTheme(t: Theme): void { this.theme = t; if (t === 'system') remove(KEYS.theme); else write(KEYS.theme, t); }
  /* Kept for the old dark-mode switch; setTheme is the way back to 'system'. */
  setDark(on: boolean): void { this.setTheme(on ? 'dark' : 'light'); }
  cycleTheme(): void { this.setTheme(THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length]); }
  setAnimations(on: boolean): void { this.animations = on; write(KEYS.anim, on ? '1' : '0'); }
  setExerciseMode(m: ExerciseMode): void { this.exerciseMode = m; write(KEYS.exmode, m); }
  setVoice(on: boolean): void { this.voice = on; write(KEYS.voice, on ? '1' : '0'); }
  setMapProgress(on: boolean): void { this.mapProgress = on; write(KEYS.mapProgress, on ? '1' : '0'); }
  setZoom(z: ZoomStep): void { this.zoom = nearestZoom(z); write(KEYS.zoom, String(this.zoom)); }
  zoomIn(): void { this.setZoom(zoomBy(this.zoom, 1)); }
  zoomOut(): void { this.setZoom(zoomBy(this.zoom, -1)); }
  resetZoom(): void { this.setZoom(ZOOM_DEFAULT); }
  setZoomKeys(on: boolean): void { this.zoomKeys = on; write(KEYS.zoomKeys, on ? '1' : '0'); }
  setSwapDragButtons(on: boolean): void { this.swapDragButtons = on; write(KEYS.swapDrag, on ? '1' : '0'); }
  setTips(on: boolean): void { this.tips = on; write(KEYS.tips, on ? '1' : '0'); }
  setCardOpen(m: CardOpen): void { this.cardOpen = m; write(KEYS.cardOpen, m); }
  setLockGrace(s: number): void { if (!Number.isFinite(s)) return; this.lockGrace = clampGrace(s); write(KEYS.lockGrace, String(this.lockGrace)); }
  setUnderlines(on: boolean): void { this.underlines = on; write(KEYS.underlines, on ? '1' : '0'); }
  reset(): void { [...Object.values(KEYS), ...Object.values(COLOUR_KEYS)].forEach(remove); }
}
export const settings = new Settings();
