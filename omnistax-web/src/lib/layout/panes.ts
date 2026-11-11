/* The panes the groups show, as one flat list. A pane is the thing drawn for
   one tab of one group, and it outlives where it stands: when a tab leaves a
   group and turns up in another (a drag, a split, a group closing into its
   neighbour) the same pane goes with it, so what it holds that is written
   nowhere else (words not yet sent, a scroll place, a running figure) is
   still there. Only a tab no group shows any more loses its pane.

   A pane keeps its place in the list for as long as it lives and new ones go
   on the end, so the list is never reordered and nothing is drawn again for a
   move. The same item may stand in two groups at once (a section read side by
   side with itself), which is two panes. */

/* A place panes stand in: a document group, by its key, or the sidebar, whose
   boxes are panes too, so a view dragged between the sidebar and a group is
   the same view on the other side. */
export type PanePlace = { readonly key: string; readonly tabs: readonly string[] };
export const SIDE_PLACE = 'side:left';
export type PaneSlot = { readonly id: number; readonly group: string; readonly tab: string };

const pairOf = (group: string, tab: string): string => `${group}|${tab}`;

/* The list after the groups have changed: every pane still shown where it was
   is kept as it is; a tab newly shown in a group takes the pane of the same
   tab that has just lost its group, where there is one, and a new pane where
   there is not. The list given back is the one handed in when nothing moved. */
export const settlePanes = (had: readonly PaneSlot[], groups: readonly PanePlace[], newId: () => number): readonly PaneSlot[] => {
  const want = new Set(groups.flatMap((g) => g.tabs.map((t) => pairOf(g.key, t))));
  const stays = new Set(had.filter((p) => want.has(pairOf(p.group, p.tab))).map((p) => pairOf(p.group, p.tab)));
  const fresh = groups.flatMap((g) => g.tabs.filter((t) => !stays.has(pairOf(g.key, t))).map((t) => ({ group: g.key, tab: t })));
  if (!fresh.length && stays.size === had.length) return had;
  const taken = new Set<number>();
  const moved = new Map<number, string>();
  const made: PaneSlot[] = [];
  for (const f of fresh) {
    const from = had.find((p) => p.tab === f.tab && !stays.has(pairOf(p.group, p.tab)) && !taken.has(p.id));
    if (from) { taken.add(from.id); moved.set(from.id, f.group); } else made.push({ id: newId(), group: f.group, tab: f.tab });
  }
  const kept = had.flatMap((p) => (stays.has(pairOf(p.group, p.tab)) ? [p] : moved.has(p.id) ? [{ ...p, group: moved.get(p.id)! }] : []));
  return [...kept, ...made];
};
