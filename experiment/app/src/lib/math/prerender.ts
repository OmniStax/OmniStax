/* Build-time KaTeX: turn $…$ and $$…$$ in an HTML string into rendered markup so the
   page reads without JavaScript. The colour macros come from the book. */
import katex from 'katex';

type Macros = Readonly<Record<string, string>>;
const options = (macros: Macros, display: boolean) => ({ macros: { ...macros }, displayMode: display, trust: (c: { command: string }) => c.command === '\\htmlClass', strict: false as const, throwOnError: false, output: 'htmlAndMathml' as const });

const unescape = (s: string): string => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const render = (macros: Macros, src: string, display: boolean): string => katex.renderToString(unescape(src), options(macros, display));

export const prerenderMath = (html: string, macros: Macros): string =>
  html
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => render(macros, tex, true))
    .replace(/\$([^$\n]+?)\$/g, (_, tex: string) => render(macros, tex, false));
