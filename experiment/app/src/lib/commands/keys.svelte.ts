/* Keybindings: chord -> command id, remembered in this browser. A command may
   own several chords (the palette answers to two by default). The dispatcher
   runs from the document's keydown; chords without Ctrl or Alt are left to
   inputs so typing keeps working. */
import { commands } from './registry.svelte';
import { type Bindings, type Chord, chordsFor, parseBindings, rebind, resolveChord, withoutCommand } from './chord';
import { DEFAULT_BINDINGS } from './defaults';
import type { CommandId } from './command';
export type { Bindings, Chord, ParsedChord, KeyLike } from './chord';
export { parseChord, formatChord, chord, chordOf, chordKeys, resolveChord } from './chord';

const KEY = 'omnistax-keys';
export { DEFAULT_BINDINGS } from './defaults';

const load = (): Bindings => {
  try { const parsed = parseBindings(JSON.parse(localStorage.getItem(KEY) ?? 'null')); if (parsed) return parsed; } catch { /* fall through */ }
  return DEFAULT_BINDINGS;
};
const save = (b: Bindings): void => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* private mode */ } };

class Keys {
  bindings = $state.raw<Bindings>(typeof localStorage === 'undefined' ? DEFAULT_BINDINGS : load());

  chordsFor(id: CommandId): readonly Chord[] { return chordsFor(this.bindings, id); }
  commandFor(c: Chord): CommandId | undefined { return this.bindings[c]; }
  /* Make `c` the one chord of `id`; whoever had `c` before loses it. */
  set(id: CommandId, c: Chord): void { this.bindings = rebind(this.bindings, id, c); save(this.bindings); }
  clear(id: CommandId): void { this.bindings = withoutCommand(this.bindings, id); save(this.bindings); }
  restoreDefaults(): void { this.bindings = DEFAULT_BINDINGS; try { localStorage.removeItem(KEY); } catch { /* private mode */ } }
  get isDefault(): boolean { return JSON.stringify(this.bindings) === JSON.stringify(DEFAULT_BINDINGS); }

  /* True when the event ran a command (and was consumed). */
  dispatch(e: KeyboardEvent): boolean {
    if (e.defaultPrevented) return false;
    const hit = resolveChord(this.bindings, e); if (!hit) return false;
    if (!commands.run(hit.id)) return false;
    e.preventDefault(); e.stopPropagation(); return true;
  }
}
export const keys = new Keys();
