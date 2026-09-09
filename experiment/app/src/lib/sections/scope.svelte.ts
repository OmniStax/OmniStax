/* The scope each companion view stands at, held for the whole shell. The rules
   live beside this in scope.ts; this is where they meet the reader: the focused
   section a following view reads against, the book the levels are walked in, and
   the browser that remembers where each view was left. Pins written by the older
   shell, one section per view, are read once and carried forward. */
import { focus } from './focus.svelte';
import { registry } from './registry.svelte';
import { FOLLOW_SECTION, atLevel, choose, levelOf, narrow, parseScope, resolve, stepSibling, widen, type Level, type Target, type ViewScope } from './scope';
import type { ViewKind } from '../types/ids';

const KEY = 'omnistax-scope-v2';
const OLD = 'omnistax-scope';   /* { [kind]: sectionId }, the pins before views had levels */

const read = (key: string): Record<string, unknown> => { try { const o = JSON.parse(localStorage.getItem(key) ?? 'null'); return typeof o === 'object' && o !== null ? (o as Record<string, unknown>) : {}; } catch { return {}; } };
const parseAll = (raw: Record<string, unknown>): Partial<Record<ViewKind, ViewScope>> =>
  Object.fromEntries(Object.entries(raw).flatMap(([kind, v]) => { const s = parseScope(v); return s ? [[kind, s]] : []; }));
const load = (): Partial<Record<ViewKind, ViewScope>> => {
  try {
    if (localStorage.getItem(KEY) !== null) return parseAll(read(KEY));
    const old = parseAll(read(OLD)); localStorage.removeItem(OLD); return old;
  } catch { return {}; }   /* private mode, or no browser at all */
};

class Scope {
  scopes = $state.raw<Partial<Record<ViewKind, ViewScope>>>(load());
  of(kind: ViewKind): ViewScope { return this.scopes[kind] ?? FOLLOW_SECTION; }
  targetFor(kind: ViewKind): Target { return resolve(this.of(kind), focus.section, registry.manifest); }
  levelFor(kind: ViewKind): Level { return levelOf(this.of(kind)); }
  isPinned(kind: ViewKind): boolean { return !this.of(kind).follow; }
  set(kind: ViewKind, scope: ViewScope): void { this.scopes = { ...this.scopes, [kind]: scope }; this.save(); }
  widen(kind: ViewKind): void { this.set(kind, widen(this.of(kind), registry.manifest)); }
  narrow(kind: ViewKind): void { this.set(kind, narrow(this.of(kind), focus.section, registry.manifest)); }
  atLevel(kind: ViewKind, level: Level): void { this.set(kind, atLevel(this.of(kind), level, focus.section, registry.manifest)); }
  /* Choosing a place from a crumb's menu: the view walks to that level, following again when
     the place chosen is the one the open page is in and pinning to it when it is anywhere else. */
  choose(kind: ViewKind, target: Target): void { this.set(kind, choose(target, focus.section, registry.manifest)); }
  previous(kind: ViewKind): void { this.set(kind, stepSibling(this.of(kind), -1, focus.section, registry.manifest)); }
  next(kind: ViewKind): void { this.set(kind, stepSibling(this.of(kind), 1, focus.section, registry.manifest)); }
  /* Pinning holds where the view stands now, unless a place is named; at the book there is nothing to hold. */
  pin(kind: ViewKind, target: Target = this.targetFor(kind)): void { if (target.level !== 'book') this.set(kind, { follow: false, target }); }
  unpin(kind: ViewKind): void { this.set(kind, { follow: true, level: this.levelFor(kind) }); }
  togglePin(kind: ViewKind): void { if (this.isPinned(kind)) this.unpin(kind); else this.pin(kind); }
  private save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.scopes)); } catch { /* private mode */ } }
}
export const scope = new Scope();
