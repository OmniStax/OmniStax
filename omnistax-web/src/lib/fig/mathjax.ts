/* MathJax set to glyph outlines, the typesetter of a formula that morphs. Loaded only by
   dynamic import from texmorph, so a page that never morphs never fetches it. The book's
   KaTeX colour macros are rewritten for MathJax: \htmlClass is \class, and \htmlData keeps
   its key and value as a class `hd-key=value`, which is how a \mk term is found again. */
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor, type LiteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import type { LiteElement, LiteNode } from 'mathjax-full/js/adaptors/lite/Element.js';
import 'mathjax-full/js/input/tex/base/BaseConfiguration.js';
import 'mathjax-full/js/input/tex/ams/AmsConfiguration.js';
import 'mathjax-full/js/input/tex/html/HtmlConfiguration.js';
import 'mathjax-full/js/input/tex/color/ColorConfiguration.js';
import 'mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js';
import 'mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration.js';
import 'mathjax-full/js/input/tex/configmacros/ConfigMacrosConfiguration.js';
import { MK_MACRO } from './motion';
import type { SvgNode } from './morphgeom';

export type ViewBox = readonly [number, number, number, number];
export type Typeset = { readonly markup: string; readonly tree: SvgNode; readonly vb: ViewBox };
type Macros = Readonly<Record<string, string>>;

/* Sized in the em of a `.katex` wrapper, so KaTeX's own size rules (1.21em, a readout's 1.1em) apply. */
const EM_PER_UNIT = 1 / 1000;
const adaptor: LiteAdaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const OWN: Macros = { '\\htmlClass': '\\class{#1}{#2}', '\\htmlData': '\\class{hd-#1}{#2}', '\\mk': MK_MACRO };
const mjMacros = (m: Macros): Record<string, string | [string, number]> =>
  Object.fromEntries(Object.entries({ ...m, ...OWN }).map(([k, v]) => {
    const n = Math.max(0, ...Array.from(v.matchAll(/#(\d)/g), (x) => +x[1]));
    return [k.replace(/^\\/, ''), n ? [v, n] : v];
  }));

type Doc = ReturnType<typeof mathjax.document>;
const docs = new WeakMap<Macros, Doc>();
const docFor = (m: Macros): Doc => {
  const hit = docs.get(m);
  if (hit) return hit;
  const d = mathjax.document('', {
    InputJax: new TeX({ packages: ['base', 'ams', 'html', 'color', 'boldsymbol', 'noundefined', 'configmacros'], macros: mjMacros(m) }),
    OutputJax: new SVG({ fontCache: 'none' }),
  });
  docs.set(m, d);
  return d;
};

const treeOf = (n: LiteElement): SvgNode => ({
  tag: n.kind, attrs: { ...(n.attributes as Record<string, string>) },
  children: (n.children as LiteNode[]).filter((c): c is LiteElement => c.kind !== '#text' && c.kind !== '#comment').map(treeOf),
});

export function typeset(macros: Macros, tex: string, display: boolean): Typeset {
  const root = docFor(macros).convert(tex, { display, em: 16, ex: 8, containerWidth: 1280 }) as LiteElement;
  const svg = adaptor.firstChild(root) as LiteElement;
  const vbs = (adaptor.getAttribute(svg, 'viewBox') ?? '0 0 0 0').split(/\s+/).map(Number);
  const vb: ViewBox = [vbs[0], vbs[1], vbs[2], vbs[3]];
  const em = (x: number): string => (x * EM_PER_UNIT).toFixed(3) + 'em';
  adaptor.removeAttribute(svg, 'width'); adaptor.removeAttribute(svg, 'height');
  adaptor.setAttribute(svg, 'style', `display:inline-block;position:static;width:${em(vb[2])};height:${em(vb[3])};vertical-align:${em(-(vb[1] + vb[3]))};overflow:visible`);
  adaptor.setAttribute(svg, 'aria-hidden', 'true');
  adaptor.setAttribute(svg, 'class', 'tm-part');
  adaptor.removeAttribute(svg, 'role');
  return { markup: adaptor.outerHTML(svg), tree: treeOf(svg), vb };
}
