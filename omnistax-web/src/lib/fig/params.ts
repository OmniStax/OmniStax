/* The controls of a figure, by id: what a note stores of a figure and sets
   back on it. figlib's `ctl`, `choice` and `select` enrol each control against
   the figure that holds it; a control reads and drives like a hand on it, so
   the readouts and the drawing follow. */
export type ParamValue = number | string | boolean;
export type ParamValues = Readonly<Record<string, ParamValue>>;
export type Param = { id: string; label: string; kind: 'range' | 'choice' | 'toggle'; value: number | string | boolean; min?: number; max?: number; step?: number; unit?: string; options?: readonly string[] };

export type Control = {
  readonly id: string;
  readonly param: () => Param;
  readonly drive: (v: ParamValue) => void;
  readonly input: EventTarget;   /* where the control's own `input` event fires */
};

const enrolled = new WeakMap<Element, Control[]>();

/* The id a control takes: its `key`, else its class, then `cls-2`, `cls-3` in the order the figure made them. */
const freeId = (taken: readonly Control[], want: string): string => {
  const ids = new Set(taken.map((c) => c.id));
  if (!ids.has(want)) return want;
  const n = [...Array(taken.length + 1).keys()].map((i) => i + 2).find((i) => !ids.has(`${want}-${i}`)) ?? taken.length + 2;
  return `${want}-${n}`;
};

export function enrol(fig: Element | null, want: string, make: (id: string) => Control): void {
  if (!fig) return;
  const taken = enrolled.get(fig) ?? [];
  enrolled.set(fig, [...taken, make(freeId(taken, want))]);
}

const figuresUnder = (root: Element): readonly Element[] =>
  [...(root.matches('figure') ? [root] : []), ...root.querySelectorAll('figure')].filter((f) => enrolled.has(f));

const controlsUnder = (root: Element): readonly Control[] => figuresUnder(root).flatMap((f) => enrolled.get(f) ?? []);

export const paramsOf = (root: Element): readonly Param[] => controlsUnder(root).map((c) => c.param());

export const valuesOf = (ps: readonly Param[]): ParamValues => Object.fromEntries(ps.map((p) => [p.id, p.value]));

export function setParams(root: Element, values: ParamValues): void {
  controlsUnder(root).forEach((c) => { if (c.id in values) c.drive(values[c.id]); });
}

export function onParams(root: Element, cb: (values: ParamValues) => void): () => void {
  const fire = (): void => cb(valuesOf(paramsOf(root)));
  const targets = controlsUnder(root).map((c) => c.input);
  targets.forEach((t) => t.addEventListener('input', fire));
  return () => targets.forEach((t) => t.removeEventListener('input', fire));
}
