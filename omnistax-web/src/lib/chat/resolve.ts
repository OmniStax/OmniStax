/* An answer is markdown, and it is read with the note renderer, so a model
   that writes `[[16.4]]` or `[[eq:16.1:eq-hooke]]` gives the reader a link into
   the book rather than a string of punctuation. The renderer knows nothing by
   itself: it asks a resolver, and this builds the one a chat needs, out of the
   same registry the note view reads.

   A chat resolves less than a note does. There are no pasted images in an
   answer and no highlights of the model's own, so those two answer nothing;
   what the book holds, and what the reader owns and might be pointed back at,
   answer as they do everywhere else. */
import { registry } from '../sections/registry.svelte';
import { assumedBook } from '../sections/focus.svelte';
import { noteDocs } from '../notes/docs.svelte';
import { notes } from '../notes/store.svelte';
import { label } from '../sections/grouping';
import { figureInfo } from '../notes/md/figinfo';
import { lookupVariable, symKey } from '../hover/data';
import { sectionId, sectionRef, type ChatId, type SectionRef } from '../types/ids';
import type { Resolver } from '../notes/md/render';
import { chats } from './store.svelte';
import { firstWords, spokenIn } from './model';

const refOf = (section: string): SectionRef => sectionRef(assumedBook(), sectionId(section));
const chapterData = (section: string) => {
  const dir = registry.chapterOf(refOf(section))?.dir;
  return dir ? registry.chapter(assumedBook(), dir) : undefined;
};

export const chatResolver = (): Resolver => ({
  note: (name) => noteDocs.byName(name)?.id ?? null,
  section: (id) => { const e = registry.entry(refOf(id)); return e?.built ? { title: e.title } : null; },
  highlight: (id) => {
    const n = notes.get(id); if (!n) return null;
    return { quote: n.anchor.quote, color: n.color, text: n.text, section: label(n.section, registry.entry(refOf(n.section))?.title ?? '') };
  },
  asset: () => null,
  equation: (section, id) => {
    const d = chapterData(section); if (!d) return null;
    const e = d.formulas.equations.find((x) => x.id === id); if (!e) return null;
    return { tex: e.tex, condition: e.condition, important: e.important, conceptName: d.concepts.concepts.find((c) => c.eq === e.id)?.name, anchor: e.anchor, section: e.section };
  },
  term: (section, term) => {
    const d = chapterData(section); if (!d) return null;
    const g = d.formulas.glossary.find((x) => x.term.toLowerCase() === term.toLowerCase());
    return g ? { term: g.term, definition: g.definition, section: g.section } : null;
  },
  symbol: (section, sym) => {
    const d = chapterData(section); if (!d) return null;
    const v = lookupVariable(d.formulas.variables, symKey(sym), section); if (!v) return null;
    return { sym, tex: registry.manifest(assumedBook()).symbols[sym] ?? sym, meaning: v.meaning, unit: v.unit, typeLabel: v.type ? registry.manifest(assumedBook()).types[v.type]?.label : undefined, section: v.section, anchor: v.anchor };
  },
  figure: (section, id) => {
    const doc = registry.state(refOf(section))?.docs.text;
    return doc ? figureInfo(doc, sectionId(section), id) : null;
  },
  concept: (section, id) => {
    const d = chapterData(section); if (!d) return null;
    const c = d.concepts.concepts.find((x) => x.id === id); if (!c) return null;
    const eq = c.eq ? d.formulas.equations.find((e) => e.id === c.eq) : undefined;
    return { name: c.name, kind: c.kind, why: c.status === 'built' ? c.why : undefined, section: c.section, eqTex: eq?.tex, placeholder: c.status === 'placeholder' };
  },
  /* A chat, and one message of it: what the card over a `[[chat:…]]` says.
     The index names every chat whether it has been opened or not; a message is
     only known once its chat has been read, and until then the card says the
     chat's name, which is still the truth about where the link goes. */
  chat: (id) => {
    const chat = chats.get(id as ChatId);
    const entry = chats.entry(id as ChatId);
    if (!chat && !entry) return null;
    return { name: chat?.name || entry?.name || 'Chat' };
  },
  chatMessage: (id, message) => {
    const chat = chats.get(id as ChatId); if (!chat) return null;
    const m = chat.messages[message as keyof typeof chat.messages];
    if (!m) return null;
    return { name: chat.name || 'Chat', role: m.role, line: firstWords(m.text, 18) };
  },
});

/* The first words of a chat, for a card that has nothing else to show: the
   opening question, which is what a reader remembers a chat by. */
export const openingOf = (id: ChatId): string => {
  const chat = chats.get(id);
  const first = chat ? spokenIn(chat)[0] : null;
  return first ? firstWords(first.text, 12) : '';
};
