/* User settings: colour coding, theme, animations, exercise view mode. Each is
   remembered in this browser and applied to the document as a class or attribute. */
export type Theme = 'system' | 'light' | 'dark';
export type ExerciseMode = 'all' | 'one';

const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const remove = (key: string): void => { try { localStorage.removeItem(key); } catch { /* private mode */ } };
const sysDark = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

class Settings {
  colorCoding = $state(read('omnistax-cc') !== '0');
  theme = $state<Theme>((read('omnistax-theme') as Theme | null) ?? 'system');
  animations = $state(read('omnistax-anim') !== '0');
  exerciseMode = $state<ExerciseMode>(read('omnistax-exmode') === 'one' ? 'one' : 'all');

  get dark(): boolean { return this.theme === 'system' ? sysDark() : this.theme === 'dark'; }
  setColorCoding(on: boolean): void { this.colorCoding = on; write('omnistax-cc', on ? '1' : '0'); }
  setDark(on: boolean): void { this.theme = on ? 'dark' : 'light'; write('omnistax-theme', this.theme); }
  setAnimations(on: boolean): void { this.animations = on; write('omnistax-anim', on ? '1' : '0'); }
  setExerciseMode(m: ExerciseMode): void { this.exerciseMode = m; write('omnistax-exmode', m); }
  reset(): void { ['omnistax-cc', 'omnistax-theme', 'omnistax-anim', 'omnistax-exmode'].forEach(remove); }
}
export const settings = new Settings();
