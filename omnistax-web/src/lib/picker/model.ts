/* The picker: one tree of everything the reader can point at, opened with `@`
   in a chat composer and with `[[` in the note editor. It is the same tree
   either way — the two differ only in what they do with the row chosen, a chip
   in the one and a wiki link in the other — so the nodes, the path and the
   keys that walk them live here, pure, and the component draws what this says.

   It opens on two nodes, OmniBooks and Files, and is walked one level at a
   time: a book, its chapters, a chapter's sections, a section's kinds, and the
   items of a kind; a folder of the explorer and what is in it. What is typed
   after the `@` searches everything below the level standing open, flat, each
   hit saying where it lives. */
import type { LinkTarget } from '../notes/md/links';
import type { ChipKind } from '../chat/context';

export const CATEGORIES = ['books', 'chapters', 'sections', 'figures', 'concepts', 'equations', 'definitions', 'exercises', 'folders', 'notes', 'drawings', 'files'] as const;
export type PickerCategory = (typeof CATEGORIES)[number];
/* What a row of each category becomes when it is added to a chat. */
export const CATEGORY_CHIP: Readonly<Record<PickerCategory, ChipKind>> = {
  books: 'book', chapters: 'chapter', sections: 'section', figures: 'figure', concepts: 'concept', equations: 'equation',
  definitions: 'definition', exercises: 'exercise', folders: 'folder', notes: 'note', drawings: 'drawing', files: 'file',
};

/* One thing that can be pointed at. `target` is the link it writes, which the
   note editor turns into `[[…]]`; a book, a chapter or a folder has no link
   form and is a chip only. `text` is what a chat would show the model, and a
   row whose text is heavy to gather leaves it out and the source is asked for
   it when the row is chosen. */
export type PickerRow = {
  readonly category: PickerCategory;
  readonly key: string;       /* unique within its category */
  readonly label: string;
  readonly detail: string;
  readonly target?: LinkTarget;
  readonly embed?: boolean;   /* the note editor writes this row as a card rather than a link */
  readonly text?: string;
};

/* A place in the tree. `row` is what picking it gives, and a node without one
   can only be walked into; `children` are read when asked for, so a level no
   one opens costs nothing, and `load` fetches what they need. */
export type PickerNode = {
  readonly key: string;       /* unique among its siblings */
  readonly label: string;
  readonly detail: string;
  readonly row?: PickerRow;
  readonly children?: () => readonly PickerNode[];
  readonly load?: () => Promise<unknown>;
};

/* A node as the list shows it: the path to it from the level standing open,
   and where it lives, said under its name. */
export type Listed = { readonly node: PickerNode; readonly path: readonly string[]; readonly where: string };

/* Where the list stands: the path walked, and for each step what stood in the
   field when it was taken, since the words that found a node are not the words
   inside it and only what is typed after them narrows its level. */
export type Step = { readonly key: string; readonly mark: string };
export type PickerState = { readonly path: readonly Step[]; readonly index: number };
export const open = (): PickerState => ({ path: [], index: 0 });

export const markOf = (state: PickerState): string => state.path.at(-1)?.mark ?? '';
/* What the field says, less whatever stood in it when the level was opened. */
export const queryIn = (state: PickerState, field: string): string => {
  const mark = markOf(state);
  return field.startsWith(mark) ? field.slice(mark.length) : field;
};

/* Every word typed must be somewhere in the row, case aside: the way the
   command palette and the search read a query. */
export const matches = (haystack: string, query: string): boolean => {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w !== '');
  const hay = haystack.toLowerCase();
  return words.every((w) => hay.includes(w));
};

/* The nodes from the root down the path; a step that no longer names a child stops the walk. */
export const trailOf = (root: readonly PickerNode[], path: readonly string[]): readonly PickerNode[] => {
  const out: PickerNode[] = [];
  let level = root;
  for (const key of path) {
    const n = level.find((x) => x.key === key); if (!n) break;
    out.push(n); level = n.children?.() ?? [];
  }
  return out;
};
export const levelOf = (root: readonly PickerNode[], path: readonly string[]): readonly PickerNode[] => {
  const trail = trailOf(root, path);
  return trail.length === 0 ? root : trail.length < path.length ? [] : trail.at(-1)?.children?.() ?? [];
};

/* Everything below a level, depth first, each saying the way down to it. */
export const SEARCH_LIMIT = 200;
export const descendants = (level: readonly PickerNode[], query: string, limit = SEARCH_LIMIT): readonly Listed[] => {
  const out: Listed[] = [];
  const walk = (nodes: readonly PickerNode[], path: readonly string[], names: readonly string[]): void => {
    for (const node of nodes) {
      if (out.length >= limit) return;
      const where = [...names, node.detail].filter((s) => s !== '').join(' › ');
      if (matches(`${node.label} ${node.detail}`, query)) out.push({ node, path: [...path, node.key], where });
      if (node.children) walk(node.children(), [...path, node.key], [...names, node.label]);
    }
  };
  walk(level, [], []);
  return out;
};

/* What the list shows: the level standing open, or everything below it that matches what is typed. */
export const faceOf = (state: PickerState, root: readonly PickerNode[], field: string): readonly Listed[] => {
  const level = levelOf(root, state.path.map((s) => s.key));
  const query = queryIn(state, field);
  return query.trim() === '' ? level.map((node) => ({ node, path: [node.key], where: node.detail })) : descendants(level, query);
};

/* The keys. Down and Up walk the list and wrap. */
export const nextIndex = (index: number, delta: number, count: number): number =>
  count === 0 ? 0 : (index + delta + count * 2) % count;
export const move = (state: PickerState, delta: number, count: number): PickerState =>
  ({ ...state, index: nextIndex(state.index, delta, count) });

/* Going down marks what the field held, so the new level is narrowed only by
   what is typed next; going up returns to the mark of the level above. */
export const into = (state: PickerState, path: readonly string[], field: string): PickerState =>
  ({ path: [...state.path, ...path.map((key) => ({ key, mark: field }))], index: 0 });
export const up = (state: PickerState, depth = state.path.length - 1): PickerState =>
  ({ path: state.path.slice(0, Math.max(0, depth)), index: 0 });

export const atCursor = (state: PickerState, face: readonly Listed[]): Listed | null =>
  face.length === 0 ? null : face[Math.min(state.index, face.length - 1)];

/* A node can be picked when it carries a row, and, where only a link will do, a row that writes one. */
export const pickable = (node: PickerNode, needsTarget: boolean): node is PickerNode & { readonly row: PickerRow } =>
  node.row !== undefined && (!needsTarget || node.row.target !== undefined);
