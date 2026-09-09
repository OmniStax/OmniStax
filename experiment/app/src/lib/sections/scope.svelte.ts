/* The scope each page of a companion view stands at, held for the whole shell. The
   rules live beside this in scope.ts; this is where they meet the reader: the focused
   section a following view reads against, the book the levels are walked in, and
   the browser that remembers where each view was left. Every page is its own entry,
   keyed by the item key of the tab it is — so a second concept map may stand on a
   chapter of its own — and a page with nothing saved follows the section being read.
   Pins written by the older shell, one per kind of view, are read once and carried
   forward onto that kind's singleton. */
import { focus } from './focus.svelte';
import { registry } from './registry.svelte';
import { atLevel, choose, levelOf, narrow, parseScopes, resolve, scopeAt, stepSibling, widen, type Level, type Scopes, type Target, type ViewScope } from './scope';
import type { ItemKey } from '../layout/model';

const KEY = 'omnistax-scope-v2';
const OLD = 'omnistax-scope';   /* { [kind]: sectionId }, the pins before views had levels */

const read = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } };
const load = (): Scopes => {
  try {
    if (localStorage.getItem(KEY) !== null) return parseScopes(read(KEY));
    const old = parseScopes(read(OLD)); localStorage.removeItem(OLD); return old;
  } catch { return {}; }   /* private mode, or no browser at all */
};

class Scope {
  scopes = $state.raw<Scopes>(load());
  of(key: ItemKey): ViewScope { return scopeAt(this.scopes, key); }
  targetFor(key: ItemKey): Target { return resolve(this.of(key), focus.section, registry.manifest); }
  levelFor(key: ItemKey): Level { return levelOf(this.of(key)); }
  isPinned(key: ItemKey): boolean { return !this.of(key).follow; }
  set(key: ItemKey, scope: ViewScope): void { this.scopes = { ...this.scopes, [key]: scope }; this.save(); }
  widen(key: ItemKey): void { this.set(key, widen(this.of(key), registry.manifest)); }
  narrow(key: ItemKey): void { this.set(key, narrow(this.of(key), focus.section, registry.manifest)); }
  atLevel(key: ItemKey, level: Level): void { this.set(key, atLevel(this.of(key), level, focus.section, registry.manifest)); }
  /* Choosing a place from a crumb's menu: the view walks to that level, following again when
     the place chosen is the one the open page is in and pinning to it when it is anywhere else. */
  choose(key: ItemKey, target: Target): void { this.set(key, choose(target, focus.section, registry.manifest)); }
  previous(key: ItemKey): void { this.set(key, stepSibling(this.of(key), -1, focus.section, registry.manifest)); }
  next(key: ItemKey): void { this.set(key, stepSibling(this.of(key), 1, focus.section, registry.manifest)); }
  /* Pinning holds where the view stands now, unless a place is named; at the book there is nothing to hold. */
  pin(key: ItemKey, target: Target = this.targetFor(key)): void { if (target.level !== 'book') this.set(key, { follow: false, target }); }
  unpin(key: ItemKey): void { this.set(key, { follow: true, level: this.levelFor(key) }); }
  togglePin(key: ItemKey): void { if (this.isPinned(key)) this.unpin(key); else this.pin(key); }
  private save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.scopes)); } catch { /* private mode */ } }
}
export const scope = new Scope();
