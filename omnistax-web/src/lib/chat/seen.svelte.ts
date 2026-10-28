/* When the reader last saw each chat, kept so that a chat answered while
   they were elsewhere still says Unread after a reload. The shell calls `look`
   whenever the layout or the index moves; a browser tab in the background
   shows nothing, so nothing is seen while it is. */
import { readerWritesAllowed } from '../backup/guard';
import type { ChatId } from '../types/ids';
import type { ChatEntry } from './entries';
import { look, parseSeen, unread, type Seen } from './seen';

const KEY = 'omnistax-chat-seen-v1';

class ChatSeen {
  seen = $state.raw<Seen>({});
  hidden = $state(false);

  init(): void {
    try { this.seen = parseSeen(JSON.parse(localStorage.getItem(KEY) ?? '{}')); } catch { this.seen = {}; }
    this.hidden = document.visibilityState === 'hidden';
    document.addEventListener('visibilitychange', () => { this.hidden = document.visibilityState === 'hidden'; });
  }

  unread(e: ChatEntry): boolean { return unread(e, this.seen); }

  look(visible: readonly ChatId[], rows: readonly ChatEntry[]): void {
    if (this.hidden) return;
    const next = look(this.seen, visible, rows, Date.now());
    if (next !== this.seen) { this.seen = next; this.save(); }
  }

  forget(id: ChatId): void {
    if (!(id in this.seen)) return;
    const { [id]: _gone, ...rest } = this.seen;
    this.seen = rest; this.save();
  }

  private save(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(KEY, JSON.stringify(this.seen)); } catch { /* private mode */ } }
}
export const chatSeen = new ChatSeen();
