/* The files a pull held back (held.ts), kept until the reader chooses for each
   or the file stops being held, across reloads: a pull that takes anything
   reloads the page. Kept for the repo and branch it was found in, beside the
   base, and like the base it stays out of backups and pushes: it is this
   device's account with one repo. */
import { z } from 'zod';
import { GROUPS } from './layout';
import type { Held } from './held';
import { sync } from './store.svelte';

const KEY = 'omnistax-sync-held-v1';
const HeldSchema = z.object({
  path: z.string(), label: z.string(), group: z.enum(GROUPS as [typeof GROUPS[number], ...typeof GROUPS[number][]]),
  reason: z.enum(['newer', 'unreadable', 'older']), why: z.string(),
  local: z.string().nullable(), remote: z.string(), pick: z.enum(['mine', 'theirs']).nullable(), seen: z.boolean(),
});
const SavedSchema = z.object({ repo: z.string(), branch: z.string(), items: z.array(HeldSchema) });
type Saved = z.infer<typeof SavedSchema>;

const load = (): Saved | null => { try { return SavedSchema.parse(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return null; } };

class HeldQueue {
  saved = $state.raw<Saved | null>(null);

  init(): void { this.saved = load(); }

  /* The queue counts only for the repo and branch it was found in. */
  get items(): readonly Held[] {
    const s = this.saved;
    return s && s.repo === sync.saved.repo && s.branch === sync.saved.branch ? s.items as unknown as readonly Held[] : [];
  }
  set(items: readonly Held[]): void {
    const next: Saved = { repo: sync.saved.repo, branch: sync.saved.branch, items: [...items] };
    this.saved = next;
    try { if (items.length) localStorage.setItem(KEY, JSON.stringify(next)); else localStorage.removeItem(KEY); } catch { /* private mode */ }
  }
  /* Choosing the side already chosen takes the choice back. */
  pick(path: string, p: 'mine' | 'theirs'): void {
    this.set(this.items.map((h) => (h.path === path ? { ...h, pick: h.pick === p ? null : p, seen: true } : h)));
  }
  get unseen(): number { return this.items.filter((h) => !h.seen && h.pick === null).length; }
  markSeen(): void { if (this.unseen) this.set(this.items.map((h) => ({ ...h, seen: true }))); }
}
export const heldQueue = new HeldQueue();
