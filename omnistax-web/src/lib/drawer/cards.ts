/* What a card held in a frame can point at. A drawing shows the very cards a
   note shows — the same renderer, the same lookups — so that a definition
   dragged onto a page of ink says what it says everywhere else, and a note
   renamed says its new name here too.

   The lookups are the note view's, gathered in a module of their own because
   two places now want them: a note being read, and a drawing holding a frame.
   Everything here reads the live stores, so it is not pure and is not tested
   as the model is; what it hands back is the pure renderer's own Resolver. */
import { noteDocs } from '../notes/docs.svelte';
import { notes } from '../notes/store.svelte';
import { registry } from '../sections/registry.svelte';
import { assumedBook } from '../sections/focus.svelte';
import { label } from '../sections/grouping';
import { lookupVariable, symKey } from '../hover/data';
import { figureInfo } from '../notes/md/figinfo';
import { drawingId, sectionId, sectionRef, type SectionRef } from '../types/ids';
import type { Resolver } from '../notes/md/render';
import { drawings } from './store.svelte';

const refOf = (section: string): SectionRef => sectionRef(assumedBook(), sectionId(section));
const chapterData = (section: string) => {
  const dir = registry.chapterOf(refOf(section))?.dir;
  return dir ? registry.chapter(assumedBook(), dir) : undefined;
};

/* A drawing by its id: the row answers its name without the ink ever being
   read, which is the whole reason the names are mirrored in localStorage. The
   picture is not asked for here — making one takes a turn of the loop, and a
   rendering must not wait or write — so the card is rendered waiting and the
   view fills it in afterwards, as it does for an image the reader pasted. */
export const drawingInfo = (id: string): { readonly name: string } | null => {
  const row = drawings.row(drawingId(id));
  return row ? { name: row.name } : null;
};

/* A drawing the reader named rather than pointed at, which is what
   `[[Some drawing]]` comes to when no note answers to that name. */
export const drawingNamed = (name: string): { readonly id: string; readonly name: string } | null => {
  const row = drawings.byName(name);
  return row ? { id: row.id, name: row.name } : null;
};

export const cardResolver = (): Resolver => ({
  note: (name) => noteDocs.byName(name)?.id ?? null,
  section: (id) => { const e = registry.entry(refOf(id)); return e?.built ? { title: e.title } : null; },
  highlight: (id) => {
    const n = notes.get(id);
    if (!n) return null;
    return { quote: n.anchor.quote, color: n.color, text: n.text, section: label(n.section, registry.entry(refOf(n.section))?.title ?? '') };
  },
  /* A frame reads its own picture out of the asset store, so the renderer is
     never asked to put one in the markup it writes. */
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
  concept: (section, id) => {
    const d = chapterData(section); if (!d) return null;
    const c = d.concepts.concepts.find((x) => x.id === id); if (!c) return null;
    const eq = c.eq ? d.formulas.equations.find((e) => e.id === c.eq) : undefined;
    return { name: c.name, kind: c.kind, why: c.status === 'built' ? c.why : undefined, section: c.section, eqTex: eq?.tex, placeholder: c.status === 'placeholder' };
  },
  figure: (section, id) => {
    const doc = registry.state(refOf(section))?.docs.text;
    return doc ? figureInfo(doc, sectionId(section), id) : null;
  },
  drawing: (id) => drawingInfo(id),
  drawingByName: (name) => drawingNamed(name),
});
