/* Keybindings: chord -> command id, remembered in this browser. A command may
   own several chords, and a binding may be a sequence of two presses — Ctrl+K
   Ctrl+S — of which the first is held here for a moment while the second is
   waited for. The dispatcher runs from the document's keydown; chords without
   Ctrl or Alt are left to inputs so typing keeps working. */
import { commands } from './registry.svelte';
import { type Bindings, type Chord, chordOf, chordsFor, isEditable, parseBindings, rebind, resolveChord, startsSequence, withoutCommand } from './chord';
import { DEFAULT_BINDINGS } from './defaults';
import type { CommandId } from './command';
export type { Bindings, Chord, ParsedChord, KeyLike } from './chord';
export { parseChord, formatChord, chord, chordOf, chordKeys, resolveChord, startsSequence } from './chord';

const KEY = 'omnistax-keys';
const WAIT = 1500;   /* how long the first press of a sequence is held, in milliseconds */
export { DEFAULT_BINDINGS } from './defaults';

const load = (): Bindings => {
  try { const parsed = parseBindings(JSON.parse(localStorage.getItem(KEY) ?? 'null')); if (parsed) return parsed; } catch { /* fall through */ }
  return DEFAULT_BINDINGS;
};
const save = (b: Bindings): void => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* private mode */ } };

class Keys {
  bindings = $state.raw<Bindings>(typeof localStorage === 'undefined' ? DEFAULT_BINDINGS : load());
  /* The first press of a sequence, while the shell waits for the second. */
  pending = $state.raw<Chord | null>(null);
  #timer: ReturnType<typeof setTimeout> | null = null;

  chordsFor(id: CommandId): readonly Chord[] { return chordsFor(this.bindings, id); }
  commandFor(c: Chord): CommandId | undefined { return this.bindings[c]; }
  /* Make `c` the one chord of `id`; whoever had `c` before loses it. */
  set(id: CommandId, c: Chord): void { this.bindings = rebind(this.bindings, id, c); save(this.bindings); }
  clear(id: CommandId): void { this.bindings = withoutCommand(this.bindings, id); save(this.bindings); }
  restoreDefaults(): void { this.bindings = DEFAULT_BINDINGS; try { localStorage.removeItem(KEY); } catch { /* private mode */ } }
  get isDefault(): boolean { return JSON.stringify(this.bindings) === JSON.stringify(DEFAULT_BINDINGS); }

  /* Hold a press, or let go of the one being held; a held press is dropped after a
     moment, so a Ctrl+K nobody followed up on stops standing in the way. */
  private hold(c: Chord | null): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.pending = c;
    this.#timer = c ? setTimeout(() => { this.pending = null; this.#timer = null; }, WAIT) : null;
  }
  /* True when the event ran a command or began a sequence (and was consumed). */
  dispatch(e: KeyboardEvent): boolean {
    if (e.defaultPrevented) return false;
    const waiting = this.pending;
    const hit = resolveChord(this.bindings, e, waiting);
    const step = chordOf(e); if (!step) return false;   /* a modifier on its own is no press at all */
    if (waiting) this.hold(null);                       /* the wait is over: this press answers it or nothing does */
    if (hit) { if (!commands.run(hit.id)) return false; e.preventDefault(); e.stopPropagation(); return true; }
    const typing = isEditable(e.target) && !(e.ctrlKey || e.metaKey || e.altKey);
    if (waiting || typing || !startsSequence(this.bindings, step)) return false;
    this.hold(step); e.preventDefault(); e.stopPropagation(); return true;
  }
}
export const keys = new Keys();
