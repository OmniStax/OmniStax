import { readerWritesAllowed } from '../backup/guard';
import { tipsOf, TipStateSchema, stepTip, visit, type Tip, type TipState } from './model';
import { i18n } from '../i18n/store.svelte';

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
  /* In the reader's language: i18n.t reads the locale, so the card follows a change of it. */
  get current(): Tip | null { return this.at === null ? null : tipsOf(i18n.t)[this.at] ?? null; }
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
