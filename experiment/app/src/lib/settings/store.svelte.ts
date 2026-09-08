/* User settings: colour coding, theme, animations, exercise view mode, voice.
   Each is remembered in this browser and applied to the document as a class or
   attribute. */
export type Theme = 'system' | 'light' | 'dark';
export type ExerciseMode = 'all' | 'one';
export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

const KEYS = { cc: 'omnistax-cc', theme: 'omnistax-theme', anim: 'omnistax-anim', exmode: 'omnistax-exmode', voice: 'omnistax-voice' } as const;
const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const remove = (key: string): void => { try { localStorage.removeItem(key); } catch { /* private mode */ } };
const sysDark = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
const readTheme = (): Theme => { const t = read(KEYS.theme); return t === 'light' || t === 'dark' ? t : 'system'; };

class Settings {
  colorCoding = $state(read(KEYS.cc) !== '0');
  theme = $state<Theme>(readTheme());
  animations = $state(read(KEYS.anim) !== '0');
  exerciseMode = $state<ExerciseMode>(read(KEYS.exmode) === 'one' ? 'one' : 'all');
  voice = $state(read(KEYS.voice) === '1');

  get dark(): boolean { return this.theme === 'system' ? sysDark() : this.theme === 'dark'; }
  setColorCoding(on: boolean): void { this.colorCoding = on; write(KEYS.cc, on ? '1' : '0'); }
  setTheme(t: Theme): void { this.theme = t; if (t === 'system') remove(KEYS.theme); else write(KEYS.theme, t); }
  /* Kept for the old dark-mode switch; setTheme is the way back to 'system'. */
  setDark(on: boolean): void { this.setTheme(on ? 'dark' : 'light'); }
  cycleTheme(): void { this.setTheme(THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length]); }
  setAnimations(on: boolean): void { this.animations = on; write(KEYS.anim, on ? '1' : '0'); }
  setExerciseMode(m: ExerciseMode): void { this.exerciseMode = m; write(KEYS.exmode, m); }
  setVoice(on: boolean): void { this.voice = on; write(KEYS.voice, on ? '1' : '0'); }
  reset(): void { Object.values(KEYS).forEach(remove); }
}
export const settings = new Settings();
