/* While a note is being written, a line that is nothing but an embed shows
   the card it stands for, as the reading side does; the source comes back the
   moment the cursor is on that line, so it is edited as text and read as a
   card. */
import { StateEffect, StateField, type EditorState, type Extension, type Range } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view';
import { cardBooks, cardResolver } from '../../drawer/cards';
import { fillThumbs, thumbnailOf, waitingThumbs } from '../../drawer/thumb';
import { anyHighlight, fileStub } from '../../files/resolver';
import { drawingId } from '../../types/ids';
import { ChatMounts } from '../../drawer/chatmounts';
import type { Resolver } from './render';
import { loadRenderer, loaded } from './lazy';
import { fetchMissing } from './fetch';
import './cards.css';

const EMBED_LINE = /^\s*!\[\[[^\]\n]+\]\]\s*$/;

const resolver = (): Resolver => ({ ...cardResolver(), highlight: (id) => anyHighlight(id), file: (id) => fileStub(id) });

/* Something the cards wait on has landed — the renderer, a chapter, a
   section — and every card is drawn again. */
const redraw = StateEffect.define<null>();
/* Each card's missing chapter is asked for once, so one that never lands is not asked for forever. */
const asked = new Set<string>();
/* A whole chat's card holds the live tree, let go when the card is. */
const chatsIn = new WeakMap<HTMLElement, ChatMounts>();

class CardWidget extends WidgetType {
  constructor(readonly source: string, readonly round: number) { super(); }
  eq(other: CardWidget): boolean { return other.source === this.source && other.round === this.round; }
  toDOM(view: EditorView): HTMLElement {
    const host = document.createElement('div');
    host.className = 'cm-embed-card';
    const render = loaded();
    if (!render) return host;
    host.innerHTML = render(this.source.trim(), resolver());
    cardBooks.setMath(host);
    for (const id of waitingThumbs(host)) {
      void thumbnailOf(drawingId(id)).then((url) => { if (url) void fillThumbs(host, drawingId(id), url); });
    }
    if (host.querySelector('.wiki.dead[data-embed]') && !asked.has(this.source)) {
      asked.add(this.source);
      void fetchMissing(host, cardBooks).then(() => { if (view.dom.isConnected) view.dispatch({ effects: redraw.of(null) }); });
    }
    if (host.querySelector('.chat-tree-embed')) {
      const chats = new ChatMounts();
      chats.fill(host);
      chatsIn.set(host, chats);
    }
    return host;
  }
  destroy(dom: HTMLElement): void { chatsIn.get(dom)?.releaseAll(); }
  /* A press on a card puts the cursor on its line, which shows the source;
     a chat's tree is used where it stands, and only its name line does that. */
  ignoreEvent(e: Event): boolean {
    const t = e.target instanceof Element ? e.target : null;
    return !!t?.closest('.chat-tree-embed') && !t.closest('.embed-eyebrow');
  }
}

const onCursor = (state: EditorState, from: number, to: number): boolean =>
  state.selection.ranges.some((r) => r.from <= to && r.to >= from);

const build = (state: EditorState, round: number): DecorationSet => {
  if (!loaded()) return Decoration.none;
  const ranges: Range<Decoration>[] = [];
  for (let n = 1; n <= state.doc.lines; n++) {
    const line = state.doc.line(n);
    if (!EMBED_LINE.test(line.text) || onCursor(state, line.from, line.to)) continue;
    ranges.push(Decoration.replace({ widget: new CardWidget(line.text, round), block: true }).range(line.from, line.to));
  }
  return Decoration.set(ranges);
};

type Cards = { readonly set: DecorationSet; readonly round: number };

const cards = StateField.define<Cards>({
  create: (state) => ({ set: build(state, 0), round: 0 }),
  update: (value, tr) => {
    const again = tr.effects.some((e) => e.is(redraw));
    if (!again && !tr.docChanged && !tr.selection) return value;
    const round = value.round + (again ? 1 : 0);
    return { set: build(tr.state, round), round };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.set),
});

const look = EditorView.theme({ '.cm-embed-card': { padding: '6px 0', fontFamily: 'var(--sans)', lineHeight: '1.45', cursor: 'text' } });

export const embedCards = (): Extension => [cards, look];

/* The renderer is fetched the first time a note is written; the cards come
   in when it lands. */
export const drawCardsWhenReady = (view: EditorView): void => {
  if (loaded()) return;
  void loadRenderer().then(() => { if (view.dom.isConnected) view.dispatch({ effects: redraw.of(null) }); });
};
