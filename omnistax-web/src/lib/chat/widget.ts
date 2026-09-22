/* A model may answer with a small page rather than with words: a fenced block
   tagged `widget` holding a whole HTML document, which the app shows in a
   sandbox. Nothing else in an answer is ever HTML — the renderer escapes it —
   so this is the one door, and it is opened per chat and closed by default.

   Cutting the answer into parts here rather than in the renderer keeps the
   renderer pure markdown and keeps this testable: an answer is a list of parts
   whatever it holds, and a widget arriving half-written while the stream runs
   is a part like any other, still growing. */

export type AnswerPart =
  | { readonly kind: 'markdown'; readonly text: string }
  | { readonly kind: 'widget'; readonly html: string; readonly open: boolean };   /* open: the fence has not been closed yet, so the document is still arriving */

const FENCE = /^([ \t]*)(`{3,}|~{3,})[ \t]*widget[ \t]*$/;

/* The answer as parts, in order. A widget the reader has not asked for is left
   as the markdown it was written as, so they can still read what the model
   sent; nothing is hidden from them. */
export const partsOf = (markdown: string, widgets: boolean): readonly AnswerPart[] => {
  if (!widgets) return markdown.trim() === '' ? [] : [{ kind: 'markdown', text: markdown }];
  const lines = markdown.split('\n');
  const out: AnswerPart[] = [];
  let text: string[] = [];
  const flush = (): void => { if (text.join('\n').trim() !== '') out.push({ kind: 'markdown', text: text.join('\n') }); text = []; };
  for (let i = 0; i < lines.length; i++) {
    const open = FENCE.exec(lines[i]);
    if (!open) { text.push(lines[i]); continue; }
    flush();
    const close = new RegExp(`^[ \\t]*${open[2][0]}{${open[2].length},}[ \\t]*$`);
    const body: string[] = [];
    let closed = false;
    for (i++; i < lines.length; i++) {
      if (close.test(lines[i])) { closed = true; break; }
      body.push(lines[i]);
    }
    out.push({ kind: 'widget', html: body.join('\n'), open: !closed });
  }
  flush();
  return out;
};

/* How tall a widget stands before it asks for more, and the most it may ask
   for: a page in a sandbox should not be able to push the answer off screen. */
export const WIDGET_HEIGHT = 320;
export const WIDGET_MAX_HEIGHT = 1200;

/* A widget says how much room it wants by posting `{ height }` to its parent.
   Anything else it posts is not a height and is ignored. */
export const heightOf = (data: unknown): number | null => {
  const h = (typeof data === 'object' && data !== null ? (data as { height?: unknown }).height : undefined);
  const n = typeof h === 'number' ? h : Number(h);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), WIDGET_MAX_HEIGHT) : null;
};
