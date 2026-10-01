import { readerWritesAllowed } from '../backup/guard';
import { TIPS, TipStateSchema, stepTip, visit, type Tip, type TipState } from './model';

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
  at = $state<number | null>(null);
  get current(): Tip | null { return this.at === null ? null : TIPS[this.at] ?? null; }
  /* Called once per page load. */
  arrive(enabled: boolean, now: number = Date.now()): void {
    const { state, tip } = visit(load(), now, enabled);
    save(state);
    this.at = tip;
  }
  step(delta: 1 | -1): void { if (this.at !== null) this.at = stepTip(this.at, delta); }
  close(): void { this.at = null; }
}
export const tips = new Tips();
