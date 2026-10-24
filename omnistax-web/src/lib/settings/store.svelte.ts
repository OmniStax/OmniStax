/* User settings: theme, whether figures start playing, exercise view mode, voice, and whether a concept
   map opens with the practice bars drawn on its nodes. What a book colours and
   underlines is the book's own (highlights.ts), read here for the page.
   Each is remembered in this browser and applied to the document as a class or
   attribute. */
import { type ZoomStep, ZOOM_DEFAULT, nearestZoom, zoomBy } from './zoom';
import { readerWritesAllowed } from '../backup/guard';
import { type FontId, DEFAULT_FIGURE_FONT, DEFAULT_BODY_FONT, parseFont, effective } from './fonts';
import type { ColourShown } from '../colours/switches';
import { type PageHighlights, pageHighlights } from './highlights';
import { highlights } from './highlights.svelte';
export type { FontId } from './fonts';
export type { ZoomStep } from './zoom';
export { ZOOM_STEPS, ZOOM_DEFAULT, zoomLabel, zoomPx } from './zoom';
export type Theme = 'system' | 'light' | 'dark';
export type ExerciseMode = 'all' | 'one';
export type CardOpen = 'hover' | 'click';
export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];
export type Preview = { figureFont?: FontId; bodyFont?: FontId; theme?: Theme };
export const LOCK_GRACE = { min: 3, max: 120 } as const;
export const DEFAULTS = { theme: 'system' as Theme, animations: true, exerciseMode: 'all' as ExerciseMode, voice: false, mapProgress: true, zoom: ZOOM_DEFAULT, swapDragButtons: false, tips: true, cardOpen: 'hover' as CardOpen, lockGrace: 10, fillAll: false, fillParagraphs: false, fillFigures: false, figureFont: DEFAULT_FIGURE_FONT, bodyFont: DEFAULT_BODY_FONT } as const;

const KEYS = { theme: 'omnistax-theme', anim: 'omnistax-anim', exmode: 'omnistax-exmode', voice: 'omnistax-voice', mapProgress: 'omnistax-map-progress', zoom: 'omnistax-zoom', swapDrag: 'omnistax-swap-drag', tips: 'omnistax-tips', cardOpen: 'omnistax-card-open', fillAll: 'omnistax-fill-all', fillParagraphs: 'omnistax-fill-paragraphs', fillFigures: 'omnistax-fill-figures', lockGrace: 'omnistax-lock-grace', figureFont: 'omnistax-figure-font', bodyFont: 'omnistax-body-font' } as const;
const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const remove = (key: string): void => { if (!readerWritesAllowed()) return; try { localStorage.removeItem(key); } catch { /* private mode */ } };
const sysDark = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
const readTheme = (): Theme => { const t = read(KEYS.theme); return t === 'light' || t === 'dark' ? t : 'system'; };
const readZoom = (): ZoomStep => { const v = Number(read(KEYS.zoom)); return Number.isFinite(v) && v > 0 ? nearestZoom(v) : ZOOM_DEFAULT; };
const clampGrace = (v: number): number => Math.round(Math.min(LOCK_GRACE.max, Math.max(LOCK_GRACE.min, v)));
const readGrace = (): number => { const s = read(KEYS.lockGrace); const v = Number(s); return s !== null && Number.isFinite(v) ? clampGrace(v) : DEFAULTS.lockGrace; };

class Settings {
  theme = $state<Theme>(readTheme());
  /* Whether every figure runs or every figure stands still: the "Figures start"
     setting, playing unless the reader chose paused. */
  animations = $state(read(KEYS.anim) !== '0');
  exerciseMode = $state<ExerciseMode>(read(KEYS.exmode) === 'one' ? 'one' : 'all');
  voice = $state(read(KEYS.voice) === '1');
  /* Where a concept map starts: with the mastery bars on its nodes, or without
     them. Each map keeps its own switch afterwards, so this only says what a
     map that has just opened shows. */
  mapProgress = $state(read(KEYS.mapProgress) !== '0');
  /* How large the app's own text is. Ctrl+= / Ctrl+− / Ctrl+0 are the book's
     keys, always: the shell takes them for its own text and the browser never
     sees them. */
  zoom = $state<ZoomStep>(readZoom());
  /* Which mouse button drags a card out of a panel. Off — the way the book
     comes — the left button drags and the right one sweeps a selection across
     the words; on, the two trade places, for a reader who would rather keep
     the left button on the text. */
  swapDragButtons = $state(read(KEYS.swapDrag) === '1');
  tips = $state(read(KEYS.tips) !== '0');
  /* How wide the text runs: the article column, the paragraphs in it and the
     figures each let go of their own cap, all off the way the book comes. */
  fillAll = $state(read(KEYS.fillAll) === '1');
  fillParagraphs = $state(read(KEYS.fillParagraphs) === '1');
  fillFigures = $state(read(KEYS.fillFigures) === '1');
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

  /* What the page being read shows: the book's own highlights (highlights.ts). */
  get page(): PageHighlights { return pageHighlights(highlights.values); }
  get shown(): ColourShown { return this.page.shown; }
  get dark(): boolean { const t = this.effectiveTheme; return t === 'system' ? sysDark() : t === 'dark'; }
  setFigureFont(id: FontId): void { this.figureFont = id; write(KEYS.figureFont, id); }
  setBodyFont(id: FontId): void { this.bodyFont = id; write(KEYS.bodyFont, id); }
  setPreview(p: Partial<Preview>): void { this.preview = { ...this.preview, ...p }; }
  clearPreview(): void { this.preview = {}; }
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
  setSwapDragButtons(on: boolean): void { this.swapDragButtons = on; write(KEYS.swapDrag, on ? '1' : '0'); }
  setTips(on: boolean): void { this.tips = on; write(KEYS.tips, on ? '1' : '0'); }
  setFillAll(on: boolean): void { this.fillAll = on; write(KEYS.fillAll, on ? '1' : '0'); }
  setFillParagraphs(on: boolean): void { this.fillParagraphs = on; write(KEYS.fillParagraphs, on ? '1' : '0'); }
  setFillFigures(on: boolean): void { this.fillFigures = on; write(KEYS.fillFigures, on ? '1' : '0'); }
  setCardOpen(m: CardOpen): void { this.cardOpen = m; write(KEYS.cardOpen, m); }
  setLockGrace(s: number): void { if (!Number.isFinite(s)) return; this.lockGrace = clampGrace(s); write(KEYS.lockGrace, String(this.lockGrace)); }
  reset(): void { Object.values(KEYS).forEach(remove); remove('omnistax-zoom-keys'); }
}
export const settings = new Settings();
