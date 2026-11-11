/* The place each page of a companion view stands on, held for the whole shell. The
   rules live beside this in scope.ts; this is where they meet the reader: the section
   being read, which a view is placed beside when it first opens, the book the levels
   are walked in, and the browser that remembers where each view was left. Every page
   is its own entry, keyed by the item key of the tab it is — so a second concept map
   may stand on a chapter of its own. A view stays where it was put: it moves only
   when the reader sends it, from its bar, a command, or a card that shows a concept
   in it. Scopes written by the older shell, one per kind of view, are read once and
   carried forward onto that kind's singleton. */
import { focus } from './focus.svelte';
import { registry } from './registry.svelte';
import { atLevel, bookOfScope, levelOf, narrow, parseScopes, placeOf, placed, resolve, sameTarget, scopeAt, settle, stepSibling, widen, type Level, type Scopes, type Target, type ViewScope } from './scope';
import type { BookTree } from '../commands/browser';
import type { ItemKey } from '../layout/model';
import { readerWritesAllowed } from '../backup/guard';
import { retiredViewKeys, type SectionRef } from '../types/ids';

const KEY = 'omnistax-scopes';

const read = (key: string): unknown => { try { return JSON.parse(retiredViewKeys(localStorage.getItem(key) ?? 'null')); } catch { return null; } };
/* Where a focused map was held while views followed the page; nothing reads it now. */
const RETIRED = 'omnistax-scopes-held';
const load = (): Scopes => {
  try { localStorage.removeItem(RETIRED); return parseScopes(read(KEY)); } catch { return {}; }   /* private mode, or no browser at all */
};

class Scope {
  scopes = $state.raw<Scopes>(load());
  of(key: ItemKey): ViewScope { return scopeAt(this.scopes, key); }
  /* The tree of the book a view stands in. */
  treeOf(key: ItemKey): BookTree | null { const b = bookOfScope(this.of(key), focus.section); return b ? registry.manifest(b) : null; }
  targetFor(key: ItemKey): Target | null { return resolve(this.of(key), focus.section, this.treeOf(key)); }
  levelFor(key: ItemKey): Level { return levelOf(this.of(key)); }
  set(key: ItemKey, scope: ViewScope): void { this.scopes = { ...this.scopes, [key]: scope }; this.save(); }
  /* A view drawn for the first time takes the place it was opened beside, and keeps it. */
  settle(key: ItemKey): void { const now = this.of(key), next = settle(now, focus.section, this.treeOf(key)); if (next !== now) this.set(key, next); }
  widen(key: ItemKey): void { const t = this.treeOf(key); if (t) this.set(key, widen(this.of(key), t)); }
  narrow(key: ItemKey): void { const t = this.treeOf(key); if (t) this.set(key, narrow(this.of(key), focus.section, t)); }
  atLevel(key: ItemKey, level: Level): void { const t = this.treeOf(key); if (t) this.set(key, atLevel(this.of(key), level, focus.section, t)); }
  previous(key: ItemKey): void { this.step(key, -1); }
  next(key: ItemKey): void { this.step(key, 1); }
  private step(key: ItemKey, dir: 1 | -1): void { const t = this.treeOf(key); if (t) this.set(key, stepSibling(this.of(key), dir, focus.section, t)); }
  /* Sending a view to a place, which carries its own level. */
  put(key: ItemKey, target: Target): void { this.set(key, placed(target)); }
  /* The place around a section at the level a view stands at: where it goes to show something of that section. */
  private around(key: ItemKey, section: SectionRef): Target { return placeOf(this.levelFor(key), section, registry.manifest(section.book)); }
  /* Sending a view to where a section is, keeping its level. A view already there is left as it is. */
  show(key: ItemKey, section: SectionRef): void { const to = this.around(key, section), now = this.targetFor(key); if (!now || !sameTarget(now, to) || this.of(key).follow) this.put(key, to); }
  /* Whether a view stands away from the page being read, and sending it back there. */
  away(key: ItemKey): boolean { const now = this.targetFor(key), s = focus.section; return !!now && !!s && !sameTarget(now, this.around(key, s)); }
  here(key: ItemKey): void { const s = focus.section; if (s) this.put(key, this.around(key, s)); }
  private save(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(KEY, JSON.stringify(this.scopes)); } catch { /* private mode */ } }
}
export const scope = new Scope();
