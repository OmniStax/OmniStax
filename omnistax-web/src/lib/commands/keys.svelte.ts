/* Keybindings: chord -> command id, remembered in this browser. A command may
   own several chords, and a binding may be a sequence of two presses — Ctrl+K
   Ctrl+S — of which the first is held here for a moment while the second is
   waited for. The dispatcher runs from the document's keydown; chords without
   Ctrl or Alt are left to inputs so typing keeps working. An installed app is
   the same browser and profile in another window, so it reads the same bindings. */
import { commands } from './registry.svelte';
import { type Bindings, type Chord, chordOf, chordsFor, isEditable, parseBindings, rebind, resolveChord, startsSequence, withoutCommand } from './chord';
import { defaultBindings } from './defaults';
import { host } from './host.svelte';
import type { CommandId } from './command';
export type { Bindings, Chord, ParsedChord, KeyLike } from './chord';
export { parseChord, formatChord, chord, chordOf, chordKeys, resolveChord, startsSequence } from './chord';

const KEY = 'omnistax-keys';
const WAIT = 1500;   /* how long the first press of a sequence is held, in milliseconds */
export { DEFAULT_BINDINGS } from './defaults';

/* What this browser holds, or nothing at all when the reader has never changed
   a chord — in which case the bindings are the host's own defaults, read live,
   so installing the book as an app hands the Ctrl chords back on the spot. */
const load = (): Bindings | null => {
  try { return parseBindings(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return null; }
};
const save = (b: Bindings): void => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* private mode */ } };

class Keys {
  #edited = $state.raw<Bindings | null>(typeof localStorage === 'undefined' ? null : load());
  bindings: Bindings = $derived(this.#edited ?? defaultBindings(host.info));
  /* The chords the book ships with on this host, which a restore goes back to. */
  private get defaults(): Bindings { return defaultBindings(host.info); }
  /* The first press of a sequence, while the shell waits for the second. */
  pending = $state.raw<Chord | null>(null);
  #timer: ReturnType<typeof setTimeout> | null = null;

  chordsFor(id: CommandId): readonly Chord[] { return chordsFor(this.bindings, id); }
  commandFor(c: Chord): CommandId | undefined { return this.bindings[c]; }
  /* Make `c` the one chord of `id`; whoever had `c` before loses it. */
  set(id: CommandId, c: Chord): void { this.edit(rebind(this.bindings, id, c)); }
  clear(id: CommandId): void { this.edit(withoutCommand(this.bindings, id)); }
  private edit(b: Bindings): void { this.#edited = b; save(b); }
  restoreDefaults(): void { this.#edited = null; try { localStorage.removeItem(KEY); } catch { /* private mode */ } }
  get isDefault(): boolean { return this.#edited === null; }
  /* One command back to the chords it shipped with; whoever holds them now loses them. */
  restoreDefault(id: CommandId): void {
    this.edit(chordsFor(this.defaults, id).reduce((b, c) => rebind(b, id, c, true), withoutCommand(this.bindings, id)));
  }
  isDefaultFor(id: CommandId): boolean { return JSON.stringify([...this.chordsFor(id)].sort()) === JSON.stringify([...chordsFor(this.defaults, id)].sort()); }

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
