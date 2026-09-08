/* Key chords: "Ctrl+Shift+P". Pure parse/format and the match against a
   keyboard event, so the dispatcher can be tested without a browser. "Ctrl"
   matches either ctrlKey or metaKey, so one binding serves Mac and the rest. */
import type { CommandId } from './command';

export type Chord = string & { readonly __brand: 'Chord' };
export type ParsedChord = { readonly ctrl: boolean; readonly alt: boolean; readonly shift: boolean; readonly key: string };
export type Bindings = Readonly<Record<Chord, CommandId>>;
/* The subset of KeyboardEvent the matcher reads. */
export type KeyLike = { readonly key: string; readonly code?: string; readonly ctrlKey: boolean; readonly metaKey: boolean; readonly shiftKey: boolean; readonly altKey: boolean; readonly target?: unknown };

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Fn', 'Hyper', 'Super', 'OS']);
const CODE_PUNCT: Readonly<Record<string, string>> = { Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`' };
const MOD_NAMES: Readonly<Record<string, keyof Omit<ParsedChord, 'key'>>> = { ctrl: 'ctrl', control: 'ctrl', cmd: 'ctrl', command: 'ctrl', meta: 'ctrl', alt: 'alt', option: 'alt', shift: 'shift' };

const normKey = (k: string): string => (k === ' ' || k.toLowerCase() === 'space' ? 'Space' : k.length === 1 ? k.toUpperCase() : k);

export const parseChord = (s: string): ParsedChord | null => {
  const trimmed = s.trim(); if (!trimmed) return null;
  const endsPlus = trimmed === '+' || trimmed.endsWith('++');   /* the plus key itself: "Ctrl++" */
  const body = endsPlus ? trimmed.slice(0, -2) : trimmed;
  const tokens = body ? body.split('+') : [];
  const key = endsPlus ? '+' : tokens.pop();
  if (!key || key.trim().toLowerCase() in MOD_NAMES) return null;   /* a modifier alone is not a chord */
  const mods = tokens.map((t) => MOD_NAMES[t.trim().toLowerCase()]);
  if (mods.some((m) => !m)) return null;
  return { ctrl: mods.includes('ctrl'), alt: mods.includes('alt'), shift: mods.includes('shift'), key: normKey(key.trim()) };
};
export const formatChord = (p: ParsedChord): Chord =>
  [p.ctrl ? 'Ctrl' : '', p.alt ? 'Alt' : '', p.shift ? 'Shift' : '', p.key].filter(Boolean).join('+') as Chord;
export const chord = (s: string): Chord | null => { const p = parseChord(s); return p ? formatChord(p) : null; };
/* The parts to draw as keycaps: ["Ctrl", "Shift", "P"]. */
export const chordKeys = (c: Chord): readonly string[] => { const p = parseChord(c); return p ? [p.ctrl ? 'Ctrl' : '', p.alt ? 'Alt' : '', p.shift ? 'Shift' : '', p.key].filter(Boolean) : [c]; };

/* The key name for an event, or null when only a modifier was pressed. */
export const keyOf = (e: KeyLike): string | null => {
  if (MODIFIER_KEYS.has(e.key)) return null;
  const code = e.code ?? '';
  if (/^Key[A-Z]$/.test(code)) return code[3];
  if (/^Digit\d$/.test(code)) return code[5];
  if (code in CODE_PUNCT) return CODE_PUNCT[code];
  return normKey(e.key);
};
export const chordOf = (e: KeyLike): Chord | null => {
  const key = keyOf(e); if (!key) return null;
  return formatChord({ ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, shift: e.shiftKey, key });
};

/* Typing into a field must keep working: plain keys there are never chords. */
export const isEditable = (t: unknown): boolean => {
  if (!t || typeof t !== 'object') return false;
  const el = t as { tagName?: string; isContentEditable?: boolean };
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName ?? '') || el.isContentEditable === true;
};
/* The command a key event selects under these bindings, if any. */
export const resolveChord = (bindings: Bindings, e: KeyLike): { readonly chord: Chord; readonly id: CommandId } | null => {
  const c = chordOf(e); if (!c) return null;
  if (isEditable(e.target) && !(e.ctrlKey || e.metaKey || e.altKey)) return null;
  const id = bindings[c]; return id ? { chord: c, id } : null;
};

/* Bindings as they are stored: chord -> command id, only valid chords kept. */
export const parseBindings = (raw: unknown): Bindings | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, CommandId> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) { const c = chord(k); if (c && typeof v === 'string' && v) out[c] = v as CommandId; }
  return out as Bindings;
};
export const chordsFor = (bindings: Bindings, id: CommandId): readonly Chord[] => (Object.keys(bindings) as Chord[]).filter((c) => bindings[c] === id);
export const withoutCommand = (bindings: Bindings, id: CommandId): Bindings => Object.fromEntries(Object.entries(bindings).filter(([, v]) => v !== id)) as Bindings;
/* Give `id` exactly this chord, taking it from whichever command had it. */
export const rebind = (bindings: Bindings, id: CommandId, c: Chord): Bindings => ({ ...withoutCommand(bindings, id), [c]: id });
