/* The mentions of every section, live. The notes and the highlights are in
   memory already; the chats and the drawings are read from IndexedDB once, the
   first time a section asks, and after that the stores keep what changes this
   session. The index is made again only when one of those lists changes, and
   every section reads its bubbles out of the same one. */
import { noteDocs } from './docs.svelte';
import { notes } from './store.svelte';
import { mentionIndex, mentionsIn, type HighlightAt, type Mention, type MentionIndex, type MentionSource } from './mentions';
import { chatCorpus } from '../search/chatcorpus.svelte';
import { chats } from '../chat/store.svelte';
import { drawingCorpus } from '../drawer/corpus.svelte';
import { drawings } from '../drawer/store.svelte';
import type { DrawItem } from '../drawer/model';
import type { SectionRef } from '../types/ids';

/* The words a drawing holds: a box's text, a frame's card written as the
   embed it is, and the labels of connectors and groups. A picture says nothing. */
const wordsOf = (i: DrawItem): string =>
  i.kind === 'box' ? i.body : i.kind === 'frame' ? (i.embed.startsWith('asset:') ? '' : `![[${i.embed}]]`)
    : i.kind === 'link' || i.kind === 'group' ? i.label : '';

class Mentions {
  private readonly highlightAt: HighlightAt = $derived.by(() => {
    const byId = new Map(notes.list.map((n) => [n.id, { book: n.book, section: n.section, quote: n.anchor.quote }] as const));
    return (id: string) => byId.get(id) ?? null;
  });

  private readonly sources: readonly MentionSource[] = $derived([
    ...noteDocs.list.map((d) => ({ origin: { kind: 'note' as const, note: d.id, name: d.name }, text: d.body, at: d.updated })),
    ...notes.list.filter((n) => n.text.includes('[[')).map((n) => ({
      origin: { kind: 'annotation' as const, highlight: n.id, book: n.book, section: n.section, quote: n.anchor.quote }, text: n.text, at: n.updated,
    })),
    ...chatCorpus.current.flatMap((c) => {
      const name = c.name || chats.entry(c.id)?.name || '';
      return Object.values(c.messages).filter((m) => m.id !== c.root && (m.text.includes('[[') || m.chips.length > 0)).map((m) => ({
        origin: { kind: 'chat' as const, chat: c.id, name, message: m.id, role: m.role }, text: m.text, at: m.at, chips: m.chips.map((x) => x.key),
      }));
    }),
    ...drawingCorpus.current.flatMap((d) => {
      const name = drawings.row(d.id)?.name ?? d.name;
      return d.items.flatMap((i) => { const text = wordsOf(i); return text.includes('[[') ? [{ origin: { kind: 'drawing' as const, drawing: d.id, name, item: i.id }, text, at: d.updated }] : []; });
    }),
  ]);

  private readonly index: MentionIndex = $derived(mentionIndex(this.sources, this.highlightAt));

  of(ref: SectionRef): readonly Mention[] { return mentionsIn(this.index, ref); }
  /* The chats and drawings, read once; until they land a section counts its notes alone. */
  load(): void { void chatCorpus.load(); void drawingCorpus.load(); }
}
export const mentions = new Mentions();
