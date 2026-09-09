/* The layout is a plain immutable value: two sidebars of views, any number of
   document groups of tabs arranged in a tree of rows and columns, and which
   group is focused. Every operation here is a pure function from Layout to
   Layout; the store applies them and persists. */
import { type ItemId, type GroupKey, type SectionId, itemKey, parseItemKey, isView, docItem, viewItem, newGroupKey, sectionOfItem } from '../types/ids';

export type Side = 'left' | 'right';
export type ItemKey = string;                 /* itemKey(ItemId): what tabs and sidebars hold */
export type Group = { readonly key: GroupKey; readonly tabs: readonly ItemKey[]; readonly active: ItemKey | null };
export type SideState = { readonly width: number; readonly items: readonly ItemKey[] };
export type SplitDir = 'row' | 'column';      /* row: side by side; column: stacked */
/* A split may say what share of its slot each child takes. The weights are
   relative to one another, never pixels, and a split that names none simply
   divides its slot equally. */
export type SplitNode =
  | { readonly type: 'leaf'; readonly group: GroupKey }
  | { readonly type: 'split'; readonly dir: SplitDir; readonly children: readonly SplitNode[]; readonly sizes?: readonly number[] };
export type Split = Extract<SplitNode, { readonly type: 'split' }>;
export type SplitPath = readonly number[];    /* the child indices that lead from the root down to a split */
export type Layout = {
  readonly sides: { readonly left: SideState; readonly right: SideState };
  readonly home: Readonly<Record<ItemKey, Side>>;
  readonly collapsed: readonly ItemKey[];
  readonly groups: readonly Group[];
  readonly focus: number;
  readonly tree: SplitNode;                   /* arranges the groups above; every group appears once as a leaf */
};
export type Location = { readonly type: 'side'; readonly side: Side } | { readonly type: 'group'; readonly index: number };
export type SplitSide = 'left' | 'right' | 'up' | 'down';
export const SIDE_WIDTH = { min: 200, max: 520 } as const;

const DEFAULT_HOME: Readonly<Record<ItemKey, Side>> = { 'view:concepts': 'left', 'view:contents': 'left', 'view:formulas': 'right', 'view:definitions': 'right', 'view:notes': 'right' };
const keyOf = (id: ItemId | ItemKey): ItemKey => (typeof id === 'string' ? id : itemKey(id));
const viewKey = (k: ItemKey): boolean => { const id = parseItemKey(k); return id !== null && isView(id); };
const emptyGroup = (): Group => ({ key: newGroupKey(), tabs: [], active: null });
const leaf = (group: GroupKey): SplitNode => ({ type: 'leaf', group });
type Slot = { readonly node: SplitNode; readonly weight: number };   /* one child of a split, with the share of the slot it takes */
const positive = (w: unknown): w is number => typeof w === 'number' && Number.isFinite(w) && w > 0;
/* The shares a split hands its children: the ones it names when they fit and are sound, and equal shares otherwise. */
const weightsOf = (n: Split): readonly number[] => (!!n.sizes && n.sizes.length === n.children.length && n.sizes.every(positive) ? n.sizes : n.children.map(() => 1));
const slotsOf = (n: Split): readonly Slot[] => { const w = weightsOf(n); return n.children.map((node, i) => ({ node, weight: w[i] })); };
const allEven = (ws: readonly number[]): boolean => ws.every((w) => Math.abs(w - ws[0]) <= 1e-9 * ws[0]);
/* Weights are only worth remembering when they differ, so a split of equal children is written plainly. */
const splitOf = (dir: SplitDir, slots: readonly Slot[]): SplitNode => {
  const sizes = slots.map((s) => s.weight);
  return { type: 'split', dir, children: slots.map((s) => s.node), sizes: allEven(sizes) ? undefined : sizes };
};

export const defaultLayout = (section: SectionId): Layout => {
  const group: Group = { key: newGroupKey(), tabs: [keyOf(docItem(section, 'text')), keyOf(docItem(section, 'exercises'))], active: keyOf(docItem(section, 'text')) };
  return {
    sides: { left: { width: 270, items: ['view:concepts', 'view:contents'] }, right: { width: 300, items: ['view:formulas', 'view:definitions', 'view:notes'] } },
    home: {}, collapsed: [], groups: [group], focus: 0, tree: leaf(group.key),
  };
};

export const homeSide = (l: Layout, k: ItemKey): Side => l.home[k] ?? DEFAULT_HOME[k] ?? 'left';

export const where = (l: Layout, id: ItemId | ItemKey): Location | null => {
  const k = keyOf(id);
  const side = (['left', 'right'] as const).find((s) => l.sides[s].items.includes(k));
  if (side) return { type: 'side', side };
  const index = l.groups.findIndex((g) => g.tabs.includes(k));
  return index >= 0 ? { type: 'group', index } : null;
};
export const groupsWith = (l: Layout, k: ItemKey): number[] => l.groups.flatMap((g, i) => (g.tabs.includes(k) ? [i] : []));
export const groupIndex = (l: Layout, key: GroupKey): number => l.groups.findIndex((g) => g.key === key);
export const focusedGroup = (l: Layout): Group => l.groups[l.focus] ?? l.groups[0];
export const focusedSection = (l: Layout, fallback: SectionId): SectionId => {
  const active = focusedGroup(l).active; const id = active ? parseItemKey(active) : null;
  return (id && sectionOfItem(id)) ?? fallback;
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

const leafKeys = (n: SplitNode): GroupKey[] => (n.type === 'leaf' ? [n.group] : n.children.flatMap(leafKeys));

/* Bring the tree and the group array back into agreement. Leaves that name no
   group are dropped, a group the tree forgot is appended to the root row, a
   split of one child gives way to that child and a split nested inside a split
   of its own direction is flattened into it. Every share travels with its
   child through all of that: a dropped child takes its weight away, a flattened
   split has its inner weights scaled to fill exactly the slot it had, and a
   lone child inherits the slot of the split that gave way. The group array is
   then re-ordered to the depth-first order of the leaves, so that "the next
   group" means the one that reads next, and the focus follows its own group
   through the move. */
const normalize = (l: Layout): Layout => {
  if (!l.groups.length) return normalize({ ...l, groups: [emptyGroup()], focus: 0 });
  const focusKey = l.groups[l.focus]?.key ?? null;
  const known = new Set(l.groups.map((g) => g.key));
  const seen = new Set<GroupKey>();
  const clean = (n: SplitNode): SplitNode | null => {
    if (n.type === 'leaf') { if (!known.has(n.group) || seen.has(n.group)) return null; seen.add(n.group); return n; }
    const kept = slotsOf(n).flatMap(({ node, weight }): Slot[] => {
      const x = clean(node); if (!x) return [];
      if (x.type !== 'split' || x.dir !== n.dir) return [{ node: x, weight }];
      const inner = weightsOf(x), whole = inner.reduce((a, b) => a + b, 0);
      return x.children.map((c, j) => ({ node: c, weight: (weight * inner[j]) / whole }));
    });
    return !kept.length ? null : kept.length === 1 ? kept[0].node : splitOf(n.dir, kept);
  };
  const cleaned = clean(l.tree);
  const roots: readonly Slot[] = !cleaned ? [] : cleaned.type === 'split' && cleaned.dir === 'row' ? slotsOf(cleaned) : [{ node: cleaned, weight: 1 }];
  /* A group the tree forgot joins the root row at the going rate. */
  const share = roots.length ? roots.reduce((a, r) => a + r.weight, 0) / roots.length : 1;
  const slots = [...roots, ...l.groups.filter((g) => !seen.has(g.key)).map((g) => ({ node: leaf(g.key), weight: share }))];
  const tree: SplitNode = slots.length === 1 ? slots[0].node : splitOf('row', slots);
  const byKey = new Map(l.groups.map((g) => [g.key, g] as const));
  const groups = leafKeys(tree).flatMap((k) => { const g = byKey.get(k); return g ? [g] : []; });
  return { ...l, groups, tree, focus: Math.max(0, groups.findIndex((g) => g.key === focusKey)) };
};

/* Drop empty groups (keeping at least one), then put the tree back in order. */
export const prune = (l: Layout): Layout => {
  const focusKey = l.groups[l.focus]?.key ?? null;
  const kept = l.groups.length > 1 ? l.groups.filter((g) => g.tabs.length) : l.groups;
  const groups = kept.length ? kept : [emptyGroup()];
  const at = groups.findIndex((g) => g.key === focusKey);
  return normalize({ ...l, groups, focus: at >= 0 ? at : Math.max(0, Math.min(l.focus, groups.length - 1)) });
};
const focusOn = (l: Layout, key: GroupKey): Layout => { const p = prune(l); const i = groupIndex(p, key); return { ...p, focus: i < 0 ? p.focus : i }; };

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

const SPLIT_DIR: Readonly<Record<SplitSide, SplitDir>> = { left: 'row', right: 'row', up: 'column', down: 'column' };
const SPLIT_BEFORE: Readonly<Record<SplitSide, boolean>> = { left: true, up: true, right: false, down: false };
/* Seat a new leaf beside the target one: among its siblings when they already
   run in that direction, otherwise by splitting the target where it stands. The
   new group takes half of the target's share and the target keeps the other
   half, so the group visibly splits in two and its neighbours do not stir. */
const insertLeaf = (n: SplitNode, target: GroupKey, fresh: GroupKey, side: SplitSide): SplitNode => {
  const dir = SPLIT_DIR[side], before = SPLIT_BEFORE[side], added = leaf(fresh);
  const beside = (s: Slot): Slot[] => { const gained = { node: added, weight: s.weight / 2 }, kept = { ...s, weight: s.weight / 2 }; return before ? [gained, kept] : [kept, gained]; };
  const isTarget = (c: SplitNode): boolean => c.type === 'leaf' && c.group === target;
  if (n.type === 'leaf') return n.group === target ? splitOf(dir, beside({ node: n, weight: 1 })) : n;
  if (n.dir === dir && n.children.some(isTarget)) return splitOf(dir, slotsOf(n).flatMap((s) => (isTarget(s.node) ? beside(s) : [s])));
  return { ...n, children: n.children.map((c) => insertLeaf(c, target, fresh, side)) };
};

/* Split a group (as in VS Code): the item opens again in a new group on the
   side asked for. A document stays where it was and is copied; a view moves,
   because a view lives in only one place. */
export const split = (l: Layout, index: number, side: SplitSide, id?: ItemId | ItemKey, from?: GroupKey | null): Layout => {
  const g = l.groups[index]; if (!g) return l;
  const k = id ? keyOf(id) : g.active; if (!k) return l;
  const source = id ? from ?? null : viewKey(k) ? g.key : null;
  const base = viewKey(k) ? detach(l, k) : source ? withGroups(l, l.groups.map((x) => (x.key === source ? removeFromGroup(x, k) : x))) : l;
  const fresh: Group = { key: newGroupKey(), tabs: [k], active: k };
  const at = groupIndex(base, g.key);
  const groups = [...base.groups.slice(0, at + 1), fresh, ...base.groups.slice(at + 1)];
  return focusOn({ ...base, groups, tree: insertLeaf(base.tree, g.key, fresh.key, side) }, fresh.key);
};
export const splitRight = (l: Layout, index: number, id?: ItemId | ItemKey, from?: GroupKey | null): Layout => split(l, index, 'right', id, from);
export const splitDown = (l: Layout, index: number, id?: ItemId | ItemKey, from?: GroupKey | null): Layout => split(l, index, 'down', id, from);

/* Close a whole group: it loses every tab and the prune below takes it away. A
   view that was open there simply closes, and its rail button opens it again. */
export const closeGroup = (l: Layout, index: number): Layout => {
  const g = l.groups[index]; if (!g) return l;
  return prune(withGroups(l, l.groups.map((x) => (x.key === g.key ? { ...x, tabs: [], active: null } : x))));
};
/* Keep this group alone; every other group closes the same way. */
export const closeOtherGroups = (l: Layout, index: number): Layout => {
  const g = l.groups[index]; if (!g) return l;
  return prune({ ...l, groups: l.groups.map((x) => (x.key === g.key ? x : { ...x, tabs: [], active: null })), focus: index });
};
/* Move the focus one group along the tree order, wrapping at either end. */
export const focusNext = (l: Layout, delta: 1 | -1): Layout => {
  const n = l.groups.length; if (n < 2) return l;
  return { ...l, focus: (l.focus + delta + n) % n };
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
/* Step to the next or previous tab of one group, wrapping at either end. */
export const activateNext = (l: Layout, index: number, delta: 1 | -1): Layout => {
  const g = l.groups[index]; if (!g || !g.tabs.length) return l;
  const at = g.active ? g.tabs.indexOf(g.active) : -1;
  return activate(l, index, g.tabs[(at + delta + g.tabs.length) % g.tabs.length]);
};
/* Unlike a split, which copies a document, this takes the active tab away from
   the group it was in and gives it a new group of its own on that side. */
export const moveToNewGroup = (l: Layout, index: number, side: SplitSide): Layout => {
  const g = l.groups[index]; const k = g?.active; if (!g || !k) return l;
  return split(l, index, side, k, g.key);
};
/* The node a path names, counting child indices down from the root. */
export const nodeAt = (tree: SplitNode, path: SplitPath): SplitNode | null =>
  path.reduce<SplitNode | null>((n, i) => (n && n.type === 'split' ? n.children[i] ?? null : null), tree);
const rewrite = (n: SplitNode, path: SplitPath, f: (x: Split) => SplitNode): SplitNode => {
  if (n.type !== 'split') return n;
  if (!path.length) return f(n);
  const [i, ...rest] = path;
  return n.children[i] ? { ...n, children: n.children.map((c, j) => (j === i ? rewrite(c, rest, f) : c)) } : n;
};
/* Give one split new shares, as the reader does by dragging the grip between
   two groups. Anything that does not describe its children is refused. */
export const resizeSplit = (l: Layout, path: SplitPath, sizes: readonly number[]): Layout => {
  const n = nodeAt(l.tree, path);
  if (!n || n.type !== 'split' || sizes.length !== n.children.length || !sizes.every(positive)) return l;
  return { ...l, tree: rewrite(l.tree, path, (x) => ({ ...x, sizes })) };
};
/* Forget every share: the groups fill their rows and columns equally again. */
export const evenSizes = (l: Layout): Layout => {
  const strip = (n: SplitNode): SplitNode => (n.type === 'leaf' ? n : { type: 'split', dir: n.dir, children: n.children.map(strip) });
  return { ...l, tree: strip(l.tree) };
};
export const setFocus = (l: Layout, index: number): Layout => ({ ...l, focus: Math.max(0, Math.min(index, l.groups.length - 1)) });
export const toggleCollapsed = (l: Layout, k: ItemKey): Layout => ({ ...l, collapsed: l.collapsed.includes(k) ? l.collapsed.filter((c) => c !== k) : [...l.collapsed, k] });
export const setWidth = (l: Layout, side: Side, width: number): Layout => ({ ...l, sides: { ...l.sides, [side]: { ...l.sides[side], width: Math.max(SIDE_WIDTH.min, Math.min(SIDE_WIDTH.max, Math.round(width))) } } });
/* The page's own text is open, active and focused on load: in the group that already holds it, else added to the focused group. */
export const ensureOwn = (l: Layout, section: SectionId): Layout => {
  const k = keyOf(docItem(section, 'text'));
  const at = l.groups.findIndex((x) => x.tabs.includes(k)); const g = at >= 0 ? l.groups[at] : focusedGroup(l);
  const groups = l.groups.map((x) => (x.key === g.key ? { ...x, tabs: x.tabs.includes(k) ? x.tabs : [k, ...x.tabs], active: k } : x));
  return focusOn(withGroups(l, groups), g.key);
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
  /* A tree is kept only as far as it parses; normalize below repairs whatever it names wrongly, and a layout saved before there were trees simply gets a row.
     Shares are read only when every one of them is a positive number, and normalize drops a set that no longer fits its children. */
  const node = (x: unknown): SplitNode | null => {
    if (!isRec(x)) return null;
    if (x.type === 'leaf') return typeof x.group === 'string' ? leaf(x.group as GroupKey) : null;
    if (x.type !== 'split' || (x.dir !== 'row' && x.dir !== 'column') || !Array.isArray(x.children)) return null;
    const children = x.children.flatMap((c) => { const p = node(c); return p ? [p] : []; });
    const sizes = Array.isArray(x.sizes) && x.sizes.every(positive) ? (x.sizes as readonly number[]) : undefined;
    return children.length ? { type: 'split', dir: x.dir, children, sizes } : null;
  };
  const row = groups.length === 1 ? leaf(groups[0].key) : { type: 'split' as const, dir: 'row' as const, children: groups.map((g) => leaf(g.key)) };
  const home = isRec(raw.home) ? Object.fromEntries(Object.entries(raw.home).filter((e): e is [string, Side] => e[1] === 'left' || e[1] === 'right')) : {};
  const collapsed = strs(raw.collapsed) ? raw.collapsed : [];
  const focus = typeof raw.focus === 'number' ? Math.max(0, Math.min(raw.focus, groups.length - 1)) : 0;
  return normalize({ sides: { left, right }, home, collapsed, groups, focus, tree: node(raw.tree) ?? row });
};
export const VIEW_KEYS: readonly ItemKey[] = ['concepts', 'contents', 'formulas', 'definitions', 'notes'].map((v) => keyOf(viewItem(v as never)));
