/* Build-time KaTeX: turn $…$ and $$…$$ in an HTML string into rendered markup so the
   page reads without JavaScript. The colour macros come from the book. */
import katex from 'katex';

type Macros = Readonly<Record<string, string>>;
/* The colour macros wrap a symbol in \htmlClass (its type) and \htmlData (its key in the book's symbol table); nothing else in the content may reach the DOM. */
const TRUSTED: ReadonlySet<string> = new Set(['\\htmlClass', '\\htmlData']);
const options = (macros: Macros, display: boolean) => ({ macros: { ...macros }, displayMode: display, trust: (c: { command: string }) => TRUSTED.has(c.command), strict: false as const, throwOnError: false, output: 'htmlAndMathml' as const });

const unescape = (s: string): string => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const render = (macros: Macros, src: string, display: boolean): string => katex.renderToString(unescape(src), options(macros, display));

/* One pass, so a $ that KaTeX writes into its output is never read as a delimiter. */
export const prerenderMath = (html: string, macros: Macros): string =>
  html.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, (_, display: string | undefined, inline: string | undefined) =>
    display !== undefined ? render(macros, display, true) : render(macros, inline ?? '', false));
