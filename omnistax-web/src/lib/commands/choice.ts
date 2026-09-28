/* The palette's second stage: a command that opens a list of values rather than
   running. Keyboard moves preview the highlighted value, Enter commits it,
   Escape cancels and closes, Backspace on an empty filter cancels and goes back
   up to the commands. Pure: the reducer names the effect, `perform` carries it
   out on the list's own callbacks. */
import { rank, type FuzzyMatch } from './fuzzy';

export type ChoiceValue = string;
export type ChoiceOption = { readonly value: ChoiceValue; readonly label: string; readonly detail?: string };
export type ChoiceList = {
  readonly options: readonly ChoiceOption[];
  readonly current: ChoiceValue;
  readonly preview?: (value: ChoiceValue) => void;
  readonly commit: (value: ChoiceValue) => void;
  readonly cancel?: () => void;
};
export type ChoiceStage = { readonly title: string; readonly list: ChoiceList; readonly query: string; readonly sel: number };
export type RankedOption = { readonly item: ChoiceOption; readonly match: FuzzyMatch };
export type ChoiceEffect =
  | { readonly kind: 'none' }
  | { readonly kind: 'preview'; readonly value: ChoiceValue }
  | { readonly kind: 'commit'; readonly value: ChoiceValue }
  | { readonly kind: 'cancel' }      /* revert and close the palette */
  | { readonly kind: 'back' };       /* revert and return to the commands */
export type ChoiceKey = 'up' | 'down' | 'enter' | 'escape' | 'backspace';
export type ChoiceStep = { readonly stage: ChoiceStage; readonly effect: ChoiceEffect };

const NONE: ChoiceEffect = { kind: 'none' };

export const shown = (s: ChoiceStage): readonly RankedOption[] => rank(s.query, s.list.options, (o) => o.label);

const currentIn = (s: ChoiceStage): number => Math.max(0, shown(s).findIndex((r) => r.item.value === s.list.current));

export const openChoice = (title: string, list: ChoiceList): ChoiceStage => {
  const s = { title, list, query: '', sel: 0 };
  return { ...s, sel: currentIn(s) };
};

export const filter = (s: ChoiceStage, query: string): ChoiceStage => {
  const next = { ...s, query, sel: 0 };
  return { ...next, sel: currentIn(next) };
};

export const key = (s: ChoiceStage, k: ChoiceKey): ChoiceStep => {
  const items = shown(s);
  const moved = (d: number): ChoiceStep => {
    if (!items.length) return { stage: s, effect: NONE };
    const sel = (s.sel + d + items.length) % items.length;
    return { stage: { ...s, sel }, effect: { kind: 'preview', value: items[sel].item.value } };
  };
  switch (k) {
    case 'down': return moved(1);
    case 'up': return moved(-1);
    case 'enter': { const it = items[s.sel]; return { stage: s, effect: it ? { kind: 'commit', value: it.item.value } : NONE }; }
    case 'escape': return { stage: s, effect: { kind: 'cancel' } };
    case 'backspace': return { stage: s, effect: s.query === '' ? { kind: 'back' } : NONE };
  }
};

export const perform = (list: ChoiceList, e: ChoiceEffect): void => {
  if (e.kind === 'preview') list.preview?.(e.value);
  else if (e.kind === 'commit') list.commit(e.value);
  else if (e.kind === 'cancel' || e.kind === 'back') list.cancel?.();
};
