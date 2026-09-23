/* What a card held in a frame can point at. A drawing shows the very cards a
   note shows — the same renderer, the same lookups — so that a definition
   dragged onto a page of ink says what it says everywhere else, and a note
   renamed says its new name here too.

   The lookups are the note view's, gathered in a module of their own because
   two places now want them: a note being read, and a drawing holding a frame.
   Everything here reads the live stores, so it is not pure and is not tested
   as the model is; what it hands back is the pure renderer's own Resolver. */
import { noteDocs } from '../notes/docs.svelte';
import { BookResolver } from '../notes/resolve';
import { drawingId } from '../types/ids';
import type { Resolver } from '../notes/md/render';
import { drawings } from './store.svelte';

export const cardBooks = new BookResolver();

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
  ...cardBooks.lookups(),
  note: (name) => noteDocs.byName(name)?.id ?? null,
  /* A frame reads its own picture out of the asset store, so the renderer is
     never asked to put one in the markup it writes. */
  asset: () => null,
  drawing: (id) => drawingInfo(id),
  drawingByName: (name) => drawingNamed(name),
});
