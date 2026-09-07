/* The layout is a plain immutable value: two sidebars of views, one or two
   document groups of tabs, which group is focused. Every operation here is a
   pure function from Layout to Layout; the store applies them and persists. */
import { type ItemId, type GroupKey, type SectionId, itemKey, parseItemKey, isView, docItem, viewItem, newGroupKey } from '../types/ids';

export type Side = 'left' | 'right';
export type ItemKey = string;                 /* itemKey(ItemId): what tabs and sidebars hold */
export type Group = { readonly key: GroupKey; readonly tabs: readonly ItemKey[]; readonly active: ItemKey | null };
export type SideState = { readonly width: number; readonly items: readonly ItemKey[] };
export type Layout = {
  readonly sides: { readonly left: SideState; readonly right: SideState };
  readonly home: Readonly<Record<ItemKey, Side>>;
  readonly collapsed: readonly ItemKey[];
  readonly groups: readonly Group[];
  readonly focus: number;
};
export type Location = { readonly type: 'side'; readonly side: Side } | { readonly type: 'group'; readonly index: number };
export const MAX_GROUPS = 2;
export const SIDE_WIDTH = { min: 200, max: 520 } as const;

const DEFAULT_HOME: Readonly<Record<ItemKey, Side>> = { 'view:concepts': 'left', 'view:contents': 'left', 'view:formulas': 'right', 'view:definitions': 'right', 'view:notes': 'right' };
const keyOf = (id: ItemId | ItemKey): ItemKey => (typeof id === 'string' ? id : itemKey(id));
const viewKey = (k: ItemKey): boolean => { const id = parseItemKey(k); return id !== null && isView(id); };

export const defaultLayout = (section: SectionId): Layout => ({
  sides: { left: { width: 270, items: ['view:concepts', 'view:contents'] }, right: { width: 300, items: ['view:formulas', 'view:definitions', 'view:notes'] } },
  home: {}, collapsed: [],
  groups: [{ key: newGroupKey(), tabs: [keyOf(docItem(section, 'text')), keyOf(docItem(section, 'exercises'))], active: keyOf(docItem(section, 'text')) }],
  focus: 0,
});

export const homeSide = (l: Layout, k: ItemKey): Side => l.home[k] ?? DEFAULT_HOME[k] ?? 'left';

export const where = (l: Layout, id: ItemId | ItemKey): Location | null => {
  const k = keyOf(id);
  const side = (['left', 'right'] as const).find((s) => l.sides[s].items.includes(k));
  if (side) return { type: 'side', side };
  const index = l.groups.findIndex((g) => g.tabs.includes(k));
  return index >= 0 ? { type: 'group', index } : null;
};
export const groupsWith = (l: Layout, k: ItemKey): number[] => l.groups.flatMap((g, i) => (g.tabs.includes(k) ? [i] : []));
export const focusedGroup = (l: Layout): Group => l.groups[l.focus] ?? l.groups[0];
export const focusedSection = (l: Layout, fallback: SectionId): SectionId => {
  const active = focusedGroup(l).active; const id = active ? parseItemKey(active) : null;
  return id && id.kind === 'doc' ? id.section : fallback;
};

const removeFromGroup = (g: Group, k: ItemKey): Group => {
  const i = g.tabs.indexOf(k); if (i < 0) return g;
  const tabs = g.tabs.filter((t) => t !== k);
  return { ...g, tabs, active: g.active === k ? tabs[Math.min(i, tabs.length - 1)] ?? null : g.active };
};
const withGroups = (l: Layout, groups: readonly Group[]): Layout => ({ ...l, groups });
const sideWithout = (s: SideState, k: ItemKey): SideState => ({ ...s, items: s.items.filter((t) => t !== k) });

/* Remove an item from every place it sits. */
export const detach = (l: Layout, id: ItemId | ItemKey): Layout => {
  const k = keyOf(id);
  return { ...l, sides: { left: sideWithout(l.sides.left, k), right: sideWithout(l.sides.right, k) }, groups: l.groups.map((g) => removeFromGroup(g, k)) };
};

/* Drop empty groups (keeping at least one) and clamp focus. */
export const prune = (l: Layout): Layout => {
  const kept = l.groups.length > 1 ? l.groups.filter((g) => g.tabs.length) : l.groups;
  const groups = kept.length ? kept : [{ key: newGroupKey(), tabs: [], active: null }];
  return { ...l, groups, focus: Math.max(0, Math.min(l.focus, groups.length - 1)) };
};
const focusOn = (l: Layout, key: GroupKey): Layout => { const p = prune(l); const i = p.groups.findIndex((g) => g.key === key); return { ...p, focus: i < 0 ? p.focus : i }; };

export const openSide = (l: Layout, id: ItemId | ItemKey, side: Side): Layout => {
  const k = keyOf(id); if (!viewKey(k)) return openTab(l, k, l.focus);
  const d = detach(l, k);
  return prune({ ...d, sides: { ...d.sides, [side]: { ...d.sides[side], items: [...d.sides[side].items, k] } }, home: { ...d.home, [k]: side } });
};

export type OpenOpts = { readonly before?: ItemKey | null; readonly from?: GroupKey | null };
/* A view lives in one place; a document may be open in several groups. `from` moves a tab instead of copying it. */
export const openTab = (l: Layout, id: ItemId | ItemKey, index: number, opts: OpenOpts = {}): Layout => {
  const k = keyOf(id); const g = Math.max(0, Math.min(index, l.groups.length - 1)); const target = l.groups[g];
  const base = viewKey(k) ? detach(l, k) : opts.from && opts.from !== target.key ? withGroups(l, l.groups.map((x) => (x.key === opts.from ? removeFromGroup(x, k) : x))) : l;
  const groups = base.groups.map((x) => {
    if (x.key !== target.key) return x;
    const without = x.tabs.filter((t) => t !== k);
    const at = opts.before && opts.before !== k ? without.indexOf(opts.before) : -1;
    const tabs = x.tabs.includes(k) && at < 0 ? x.tabs : at >= 0 ? [...without.slice(0, at), k, ...without.slice(at)] : [...without, k];
    return { ...x, tabs, active: k };
  });
  return focusOn(withGroups(base, groups), target.key);
};

/* Split right (as in VS Code): the active document opens again in a new group to the right and stays here; a view moves. */
export const splitRight = (l: Layout, index: number, id?: ItemId | ItemKey, from?: GroupKey | null): Layout => {
  const g = l.groups[index]; if (!g) return l;
  const k = id ? keyOf(id) : g.active; if (!k) return l;
  const source = id ? from ?? null : viewKey(k) ? g.key : null;
  if (l.groups.length >= MAX_GROUPS) return openTab(l, k, index + 1, { from: source });
  const base = viewKey(k) ? detach(l, k) : source ? withGroups(l, l.groups.map((x) => (x.key === source ? removeFromGroup(x, k) : x))) : l;
  const fresh: Group = { key: newGroupKey(), tabs: [k], active: k };
  const groups = [...base.groups.slice(0, index + 1), fresh, ...base.groups.slice(index + 1)];
  return focusOn(withGroups(base, groups), fresh.key);
};

export const closeItem = (l: Layout, id: ItemId | ItemKey, index?: number): Layout => {
  const k = keyOf(id);
  if (index == null || viewKey(k)) return prune(detach(l, k));
  return prune(withGroups(l, l.groups.map((g, i) => (i === index ? removeFromGroup(g, k) : g))));
};
export const activate = (l: Layout, index: number, id: ItemId | ItemKey): Layout => {
  const k = keyOf(id);
  return { ...l, focus: index, groups: l.groups.map((g, i) => (i === index && g.tabs.includes(k) ? { ...g, active: k } : g)) };
};
export const setFocus = (l: Layout, index: number): Layout => ({ ...l, focus: Math.max(0, Math.min(index, l.groups.length - 1)) });
export const toggleCollapsed = (l: Layout, k: ItemKey): Layout => ({ ...l, collapsed: l.collapsed.includes(k) ? l.collapsed.filter((c) => c !== k) : [...l.collapsed, k] });
export const setWidth = (l: Layout, side: Side, width: number): Layout => ({ ...l, sides: { ...l.sides, [side]: { ...l.sides[side], width: Math.max(SIDE_WIDTH.min, Math.min(SIDE_WIDTH.max, Math.round(width))) } } });
/* The page's own text is always open and active in the focused group on load. */
export const ensureOwn = (l: Layout, section: SectionId): Layout => {
  const k = keyOf(docItem(section, 'text')); const g = focusedGroup(l);
  const groups = l.groups.map((x) => (x.key === g.key ? { ...x, tabs: x.tabs.includes(k) ? x.tabs : [k, ...x.tabs], active: k } : x));
  return withGroups(l, groups);
};

/* Persistence boundary: anything read from storage is untrusted and comes back as a Layout or not at all. */
export const parseLayout = (raw: unknown, known: (k: ItemKey) => boolean): Layout | null => {
  const isRec = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
  const strs = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string');
  if (!isRec(raw) || !isRec(raw.sides) || !Array.isArray(raw.groups) || !raw.groups.length) return null;
  const side = (x: unknown): SideState | null => (isRec(x) && typeof x.width === 'number' && strs(x.items) && x.items.every((k) => viewKey(k) && known(k)) ? { width: x.width, items: x.items } : null);
  const left = side(raw.sides.left), right = side(raw.sides.right); if (!left || !right) return null;
  const seen = new Set<string>();
  const groups: Group[] = [];
  for (const g of raw.groups) {
    if (!isRec(g) || !strs(g.tabs) || !g.tabs.every(known) || new Set(g.tabs).size !== g.tabs.length) return null;
    const active = typeof g.active === 'string' && g.tabs.includes(g.active) ? g.active : g.tabs[0] ?? null;
    if (g.tabs.length && active === null) return null;
    const key = typeof g.key === 'string' && !seen.has(g.key) ? (g.key as GroupKey) : newGroupKey(); seen.add(key);
    groups.push({ key, tabs: g.tabs, active });
  }
  const home = isRec(raw.home) ? Object.fromEntries(Object.entries(raw.home).filter((e): e is [string, Side] => e[1] === 'left' || e[1] === 'right')) : {};
  const collapsed = strs(raw.collapsed) ? raw.collapsed : [];
  const focus = typeof raw.focus === 'number' ? Math.max(0, Math.min(raw.focus, groups.length - 1)) : 0;
  return { sides: { left, right }, home, collapsed, groups, focus };
};
export const VIEW_KEYS: readonly ItemKey[] = ['concepts', 'contents', 'formulas', 'definitions', 'notes'].map((v) => keyOf(viewItem(v as never)));
