import { readerWritesAllowed } from '../backup/guard';
import { TIPS, TipStateSchema, visit, type Tip, type TipState } from './model';

const KEY = 'omnistax-tips-v1';

const load = (): TipState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? TipStateSchema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success ? parsed.data : null;
  } catch { return null; }
};
const save = (s: TipState): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

class Tips {
  current = $state<Tip | null>(null);
  /* Called once per page load. */
  arrive(enabled: boolean, now: number = Date.now()): void {
    const { state, tip } = visit(load(), now, enabled);
    save(state);
    this.current = tip === null ? null : TIPS[tip];
  }
  close(): void { this.current = null; }
}
export const tips = new Tips();
