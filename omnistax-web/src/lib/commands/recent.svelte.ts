/* The commands the reader ran, most recent first, kept in this browser for
   the top of the palette. A command run again moves to the front; the reader
   may strike one from the list. */
import { readerWritesAllowed } from '../backup/guard';
import type { CommandId } from './command';

const KEY = 'omnistax-recent-commands-v1';
const read = (): readonly CommandId[] => {
  try { const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(raw) ? raw.filter((x): x is CommandId => typeof x === 'string') : []; } catch { return []; }
};

class Recent {
  ids = $state.raw<readonly CommandId[]>(typeof localStorage === 'undefined' ? [] : read());
  note(id: CommandId): void { this.put([id, ...this.ids.filter((x) => x !== id)]); }
  forget(id: CommandId): void { this.put(this.ids.filter((x) => x !== id)); }
  private put(next: readonly CommandId[]): void {
    this.ids = next;
    if (!readerWritesAllowed()) return;
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  }
}
export const recent = new Recent();
