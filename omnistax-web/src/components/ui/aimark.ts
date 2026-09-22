/* The one mark every AI-generated item of the book wears: the section's lead where
   the text was transformed, the head of every simulation, and a suggested approach
   written in the book's place. It is built as a string here so the page's static
   HTML and the app's components can wear the very same glyph, and it carries its
   own styles so no stylesheet has to know about it. It sits on the baseline of the
   words beside it and takes no height of its own. */
export type AiMarkLabel = 'AI generated';
export const AI_MARK_LABEL: AiMarkLabel = 'AI generated';

/* a four-pointed spark with a smaller one beside it, filled so it reads at 14px */
const GLYPH =
  '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">'
  + '<path d="M10 2.5l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z"/>'
  + '<path d="M18 13.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>'
  + '</svg>';

const STYLE = 'display:inline-block;width:1.05em;height:1.05em;line-height:0;margin-left:0.3em;vertical-align:-0.16em;opacity:0.55';

export const AI_MARK_HTML =
  `<span class="ai-mark" style="${STYLE}" role="img" title="${AI_MARK_LABEL}" aria-label="${AI_MARK_LABEL}">${GLYPH}</span>`;
