/* Two versions of a JSON file merged against the one they both came from, as
   git merges lines but by the shape of the value: an object key by key, a list
   of things with ids item by item, a list of names as a set, a log by what each
   side appended or took out. A change only one side made is taken; the same change made on
   both is taken once; a key or an item one side deleted and the other left
   alone is deleted. Only a leaf that both sides changed, differently, is a
   conflict, and only those are left for the reader.

   The result is two values, not one: the merge with every conflict settled
   this device's way, and the same with every conflict settled the repo's way.
   Where nothing conflicts they are equal and either is the merge. Where
   something does, the lines in which the two differ are exactly the conflicts,
   which is how the diff view shows them and lets the reader settle each one
   (conflict.ts). Pure. */

/* A key or an item a version does not have. */
export const ABSENT: unique symbol = Symbol('absent');
type Value = unknown;
type Slot = Value | typeof ABSENT;
export type Path = readonly (string | number)[];
export type Merged = { readonly mine: Slot; readonly theirs: Slot; readonly conflicts: readonly Path[] };

const isObject = (v: Slot): v is Record<string, Value> => typeof v === 'object' && v !== null && !Array.isArray(v);

/* Deep equality of JSON values, the order of an object's keys aside. */
export const same = (a: Slot, b: Slot): boolean => {
  if (a === b) return true;
  if (a === ABSENT || b === ABSENT || typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b as object);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b as object, k) && same((a as Record<string, Value>)[k], (b as Record<string, Value>)[k]));
};

const settled = (v: Slot): Merged => ({ mine: v, theirs: v, conflicts: [] });
const conflict = (mine: Slot, theirs: Slot): Merged => ({ mine, theirs, conflicts: [[]] });

/* The time a thing was last touched: both sides touching it is no conflict,
   and the later of the two is when it was. */
const TOUCHED = new Set(['updated']);

const mergeObjects = (b: Record<string, Value> | null, m: Record<string, Value>, t: Record<string, Value>): Merged => {
  const keys = [...Object.keys(m), ...Object.keys(t).filter((k) => !Object.hasOwn(m, k))];
  const mine: Record<string, Value> = {}, theirs: Record<string, Value> = {};
  const conflicts: Path[] = [];
  for (const k of keys) {
    const at = (o: Record<string, Value> | null): Slot => (o && Object.hasOwn(o, k) ? o[k] : ABSENT);
    const mk = at(m), tk = at(t);
    const r = TOUCHED.has(k) && typeof mk === 'number' && typeof tk === 'number' ? settled(Math.max(mk, tk)) : merge3(at(b), mk, tk);
    if (r.mine !== ABSENT) mine[k] = r.mine;
    if (r.theirs !== ABSENT) theirs[k] = r.theirs;
    conflicts.push(...r.conflicts.map((p) => [k, ...p]));
  }
  return { mine, theirs, conflicts };
};

/* The ids of a merged list in order: this device's, with each item only the
   repo has placed after the one it follows there, and after whatever this
   device added in the same place, so two lists appended to read as one list
   appended to twice. */
const orderOf = (mine: readonly string[], theirs: readonly string[]): string[] => {
  const out = [...mine], held = new Set(mine), there = new Set(theirs);
  let prev: string | null = null;
  for (const id of theirs) {
    if (!held.has(id)) {
      let at = prev === null ? 0 : out.indexOf(prev) + 1;
      while (at < out.length && !there.has(out[at])) at++;
      out.splice(at, 0, id); held.add(id);
    }
    prev = id;
  }
  return out;
};

const idOf = (v: Value): string | null => (isObject(v) && typeof v.id === 'string' ? v.id : null);
/* Each list's items keyed by what names them, or null when something does not
   have a name or two share one. */
const keyed = (lists: readonly (readonly Value[])[], name: (v: Value) => string | null): Map<string, Value>[] | null => {
  const out: Map<string, Value>[] = [];
  for (const list of lists) {
    const map = new Map<string, Value>();
    for (const v of list) { const k = name(v); if (k === null || map.has(k)) return null; map.set(k, v); }
    out.push(map);
  }
  return out;
};

const mergeKeyed = (maps: readonly Map<string, Value>[]): Merged => {
  const [b, m, t] = maps;
  const mine: Value[] = [], theirs: Value[] = [], conflicts: Path[] = [];
  orderOf([...m.keys()], [...t.keys()]).forEach((id) => {
    const at = (x: Map<string, Value>): Slot => (x.has(id) ? x.get(id) : ABSENT);
    const r = merge3(at(b), at(m), at(t));
    if (r.mine !== ABSENT) mine.push(r.mine);
    if (r.theirs !== ABSENT) theirs.push(r.theirs);
    conflicts.push(...r.conflicts.map((p) => [id, ...p]));
  });
  return { mine, theirs, conflicts };
};

const startsWith = (list: readonly Value[], head: readonly Value[]): boolean => head.length <= list.length && head.every((v, i) => same(v, list[i]));

const mergeLists = (b: readonly Value[] | null, m: readonly Value[], t: readonly Value[]): Merged => {
  const lists = b ? [b, m, t] : [[], m, t];
  /* Things with ids: notes, marks, the explorer's rows, a drawing's strokes. */
  const byId = keyed(lists, idOf);
  if (byId) return mergeKeyed(byId);
  /* Names: the books in the library, the folded sections, the open folders. */
  const byName = keyed(lists, (v) => (typeof v === 'string' ? v : null));
  if (byName) return mergeKeyed(byName);
  /* A log both sides appended to: the attempts, the rounds, the focus sessions.
     What each appended is kept, the repo's after this device's. Without a
     list both started from, two lists are only two lists, never one log. */
  if (b && startsWith(m, b) && startsWith(t, b)) {
    const ours = m.slice(b.length);
    return settled([...m, ...t.slice(b.length).filter((v) => !ours.some((o) => same(o, v)))]);
  }
  /* A log one side also took entries out of: an attempt is taken back when its
     exercise is answered again. Each entry is named by what it holds, so an
     entry is there or not and never changed; one side's removals are honoured
     and both sides' additions kept. What practice shows (mastery, freshness,
     the streak) is worked out from these entries, never compared. Without a
     base, both sides' entries are kept. */
  if ([m, t].every((l) => l.every(isObject))) {
    const byValue = keyed(lists, (v) => (isObject(v) ? canonical(v) : null));
    if (byValue) return mergeKeyed(byValue);
  }
  return conflict(m, t);
};

/* A JSON value as text, an object's keys in order, so that two copies of one
   entry read alike whatever order their keys were written in. */
const canonical = (v: Value): string =>
  Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
    : isObject(v) ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
      : JSON.stringify(v) ?? 'null';

export const merge3 = (b: Slot, m: Slot, t: Slot): Merged => {
  if (same(m, t)) return settled(m);
  if (same(b, m)) return settled(t);
  if (same(b, t)) return settled(m);
  if (isObject(m) && isObject(t) && (b === ABSENT || isObject(b))) return mergeObjects(b === ABSENT ? null : b, m, t);
  if (Array.isArray(m) && Array.isArray(t) && (b === ABSENT || Array.isArray(b))) return mergeLists(b === ABSENT ? null : b, m, t);
  return conflict(m, t);
};
