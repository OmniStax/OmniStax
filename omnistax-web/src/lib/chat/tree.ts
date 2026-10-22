/* The chat as a picture and as a list: the tree view's node sizes and where a
   reply lands, and the times the transcript and the Conversations page print. */
import { messageOf, transcript, type Chat, type Message, type MessageId } from './model';
import type { Size } from '../tree/layout';
import { currentLocale, t } from '../i18n';

/* The leaf set to one message exactly, where `goTo` would follow on to the
   newest branch under it. */
export const withLeaf = (chat: Chat, id: MessageId): Chat => (messageOf(chat, id) ? { ...chat, leaf: id } : chat);

/* Replying under a question would put two questions in a row, so a reply to a
   selected question forks beside it instead. */
export const replyParent = (chat: Chat, selected: MessageId): MessageId => {
  const m = messageOf(chat, selected);
  if (!m) return chat.leaf;
  return m.role === 'user' && m.parent !== null && m.id !== chat.root ? m.parent : m.id;
};

/* The first lines of a message, cut at a word, for a node too small for all of it. */
export const opening = (text: string, chars: number): string => {
  const t = text.trim();
  if (t.length <= chars) return t;
  const cut = t.slice(0, chars);
  const space = cut.lastIndexOf(' ');
  return `${space > chars * 0.6 ? cut.slice(0, space) : cut}…`;
};

export type NodeScale = { readonly w: number; readonly wide: number; readonly line: number; readonly chrome: number; readonly lines: number; readonly chars: number };
export const NODE: NodeScale = { w: 240, wide: 440, line: 19, chrome: 44, lines: 4, chars: 260 };
export const NODE_COMPACT: NodeScale = { w: 170, wide: 300, line: 16, chrome: 30, lines: 3, chars: 140 };
export const ANCHOR: Size = { w: 12, h: 12 };

const linesOf = (text: string, width: number): number => {
  const perLine = Math.max(1, Math.floor(width / 7.2));
  return text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
};

/* A node is as tall as the lines its opening needs, up to the scale's cap. */
export const nodeSize = (m: Message, s: NodeScale): Size =>
  ({ w: s.w, h: s.chrome + Math.min(s.lines, linesOf(opening(m.text, s.chars).replace(/\n/g, ' '), s.w)) * s.line });

/* An expanded node is wider and holds its whole message: as tall as its text
   was measured once drawn, and until then as its length suggests. */
export const openSize = (m: Message, s: NodeScale, measured?: number): Size =>
  ({ w: s.wide, h: s.chrome + (measured ?? linesOf(m.text.trim(), s.wide) * s.line) });

export const speakerOf = (m: Message): string => (m.role === 'user' ? t('chat.speaker.you') : m.model || t('chat.speaker.assistant'));

/* The path the reader stands on, as Markdown: each message under who said it. */
export const markdownOf = (chat: Chat): string =>
  transcript(chat).map((m) => `**${speakerOf(m)}**\n\n${m.text.trim()}`).join('\n\n');

/* The last thing the reader asked on a path. */
export const lastAsked = (path: readonly Message[]): Message | null => [...path].reverse().find((m) => m.role === 'user') ?? null;

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;

export const ageOf = (at: number, now: number): string => {
  const d = Math.max(0, now - at);
  if (d < MINUTE) return t('chat.age.now');
  if (d < HOUR) return t('chat.age.minutes', { n: Math.floor(d / MINUTE) });
  if (d < DAY) return t('chat.age.hours', { n: Math.floor(d / HOUR) });
  if (d < 7 * DAY) return t('chat.age.days', { n: Math.floor(d / DAY) });
  return new Date(at).toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric', year: new Date(at).getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
};

export const dayOf = (at: number): string => { const d = new Date(at); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

export const dayLabel = (at: number, now: number): string => {
  if (dayOf(at) === dayOf(now)) return t('chat.day.today');
  if (dayOf(at) === dayOf(now - DAY)) return t('chat.day.yesterday');
  return new Date(at).toLocaleDateString(currentLocale(), { weekday: 'long', month: 'long', day: 'numeric', year: new Date(at).getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
};

/* One formatter for every stamp, per language: a transcript or a tree stamps each of its messages. */
const STAMPS = new Map<string, Intl.DateTimeFormat>();
const stamp = (locale: string): Intl.DateTimeFormat => {
  let f = STAMPS.get(locale);
  if (!f) { f = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); STAMPS.set(locale, f); }
  return f;
};
export const timeOf = (at: number): string => stamp(currentLocale()).format(new Date(at));

/* Whether a divider stands above the message at `i`: the first one, and each
   one whose day differs from the one before. */
export const startsDay = (path: readonly Message[], i: number): boolean => i === 0 || dayOf(path[i].at) !== dayOf(path[i - 1].at);
