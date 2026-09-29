/* A chat put on a drawing. Referenced, it is one item naming the chat, drawn
   live; plain, the tree is laid out once and written as text cards joined by
   connectors, and from then on it belongs to the drawing. Both are pure. */
import { childrenOf, type Chat, type Message, type MessageId } from '../chat/model';
import { layoutTree, boundsOf } from '../tree/layout';
import { newDrawItemId, type DrawItem, type DrawItemId } from './model';

type Vec = readonly [number, number];

export const CHAT_ITEM = { w: 460, h: 320 } as const;

export const chatItemAt = (chat: Chat, at: Vec, root?: MessageId, id: DrawItemId = newDrawItemId()): DrawItem =>
  ({ kind: 'chat', id, x: at[0], y: at[1], ...CHAT_ITEM, chat: chat.id, ...(root && root !== chat.root ? { root } : {}) });

const CARD_W = 320;
const LINE = 19;
const CHARS_PER_LINE = 44;
/* A card tall enough for its words, within reason: a long answer is scrolled
   inside its card rather than laid out a page tall. */
export const cardHeight = (text: string): number => {
  const lines = text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / CHARS_PER_LINE)), 0);
  return Math.min(360, Math.max(72, 30 + lines * LINE));
};

/* The cards and connectors of a chat laid out under `at`. The empty anchor a
   chat grows from is laid out as a point and not written. */
export const plainCopy = (chat: Chat, at: Vec, root: MessageId = chat.root, newId: () => DrawItemId = newDrawItemId): readonly DrawItem[] => {
  const kids = (id: MessageId): readonly MessageId[] => childrenOf(chat, id).map((m) => m.id);
  const text = (m: Message | undefined): string => m?.text.trim() ?? '';
  const boxes = layoutTree(root, kids, (id) => (id === chat.root ? { w: 0, h: 0 } : { w: CARD_W, h: cardHeight(text(chat.messages[id])) }), { x: 28, y: 48 });
  const cards = [...boxes].filter(([id]) => id !== chat.root);
  const frame = boundsOf(cards.map(([, b]) => b));
  const ids = new Map<MessageId, DrawItemId>(cards.map(([m]) => [m, newId()]));
  const boxItems: readonly DrawItem[] = cards.map(([m, b]) => {
    const msg = chat.messages[m];
    return { kind: 'box', id: ids.get(m)!, x: at[0] + b.x - frame.x, y: at[1] + b.y - frame.y, w: b.w, h: b.h, body: text(msg), ...(msg?.role === 'user' ? { color: 'accent' } : {}) };
  });
  const links: readonly DrawItem[] = cards.flatMap(([m]) => {
    const up = chat.messages[m]?.parent;
    const from = up ? ids.get(up) : undefined;
    const to = ids.get(m);
    return from && to && m !== root
      ? [{ kind: 'link', id: newId(), from: { item: from, side: 's' }, to: { item: to, side: 'n' }, curve: 'bezier', heads: { start: false, end: true }, color: 'muted', size: 1.5, label: '' } as DrawItem]
      : [];
  });
  return [...boxItems, ...links];
};
