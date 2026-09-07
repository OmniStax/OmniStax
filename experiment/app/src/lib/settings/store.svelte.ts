/* User settings: colour coding, theme, animations, exercise view mode. Each is
   remembered in this browser and applied to the document as a class or attribute. */
export type Theme = 'system' | 'light' | 'dark';
export type ExerciseMode = 'all' | 'one';

const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const remove = (key: string): void => { try { localStorage.removeItem(key); } catch { /* private mode */ } };
const sysDark = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

class Settings {
  colorCoding = $state(read('omnia-cc') !== '0');
  theme = $state<Theme>((read('omnia-theme') as Theme | null) ?? 'system');
  animations = $state(read('omnia-anim') !== '0');
  exerciseMode = $state<ExerciseMode>(read('omnia-exmode') === 'one' ? 'one' : 'all');

  get dark(): boolean { return this.theme === 'system' ? sysDark() : this.theme === 'dark'; }
  setColorCoding(on: boolean): void { this.colorCoding = on; write('omnia-cc', on ? '1' : '0'); }
  setDark(on: boolean): void { this.theme = on ? 'dark' : 'light'; write('omnia-theme', this.theme); }
  setAnimations(on: boolean): void { this.animations = on; write('omnia-anim', on ? '1' : '0'); }
  setExerciseMode(m: ExerciseMode): void { this.exerciseMode = m; write('omnia-exmode', m); }
  reset(): void { ['omnia-cc', 'omnia-theme', 'omnia-anim', 'omnia-exmode'].forEach(remove); }
}
export const settings = new Settings();
