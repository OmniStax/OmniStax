/* User settings: colour coding, theme, animations, exercise view mode, voice,
   whether what can be looked up wears a rule under it, and whether a concept
   map opens with the practice bars drawn on its nodes.
   Each is remembered in this browser and applied to the document as a class or
   attribute. */
import { type ZoomStep, ZOOM_DEFAULT, nearestZoom, zoomBy } from './zoom';
import { readerWritesAllowed } from '../backup/guard';
export type { ZoomStep } from './zoom';
export { ZOOM_STEPS, ZOOM_DEFAULT, zoomLabel, zoomPx } from './zoom';
export type Theme = 'system' | 'light' | 'dark';
export type ExerciseMode = 'all' | 'one';
export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];
export const DEFAULTS = { theme: 'system' as Theme, colorCoding: true, underlines: true, animations: true, exerciseMode: 'all' as ExerciseMode, voice: false, mapProgress: true, zoom: ZOOM_DEFAULT, zoomKeys: true } as const;

const KEYS = { cc: 'omnistax-cc', theme: 'omnistax-theme', anim: 'omnistax-anim', exmode: 'omnistax-exmode', voice: 'omnistax-voice', underlines: 'omnistax-underlines', mapProgress: 'omnistax-map-progress', zoom: 'omnistax-zoom', zoomKeys: 'omnistax-zoom-keys' } as const;
const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const remove = (key: string): void => { if (!readerWritesAllowed()) return; try { localStorage.removeItem(key); } catch { /* private mode */ } };
const sysDark = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
const readTheme = (): Theme => { const t = read(KEYS.theme); return t === 'light' || t === 'dark' ? t : 'system'; };
const readZoom = (): ZoomStep => { const v = Number(read(KEYS.zoom)); return Number.isFinite(v) && v > 0 ? nearestZoom(v) : ZOOM_DEFAULT; };

class Settings {
  colorCoding = $state(read(KEYS.cc) !== '0');
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

  get dark(): boolean { return this.theme === 'system' ? sysDark() : this.theme === 'dark'; }
  setColorCoding(on: boolean): void { this.colorCoding = on; write(KEYS.cc, on ? '1' : '0'); }
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
  setUnderlines(on: boolean): void { this.underlines = on; write(KEYS.underlines, on ? '1' : '0'); }
  reset(): void { Object.values(KEYS).forEach(remove); }
}
export const settings = new Settings();
