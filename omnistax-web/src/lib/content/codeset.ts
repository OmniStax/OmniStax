/* A code set in text.html: one listing offered in several languages (METHOD decision 20 of the CS book).

       <div class="code-set">
         <pre data-lang="python"><code>…</code></pre>
         <pre data-lang="java" data-ai="claude-opus-5-5 high"><code>…</code></pre>
       </div>

   One <pre data-lang> per language, of pseudocode, python, java, cpp and javascript, each at most once;
   Python is present, or the set says why not in `data-no-python`. Pseudocode a source prints for code the
   set gives is its `<pre data-lang="pseudocode">`, never a <pre> of its own above the set. A variant the
   source prints carries no data-ai; one the AI translated names what translated it in `data-ai` and wears
   the AI mark. No math: a dollar sign is &#36;. A <pre> outside a set is left as it is.

   The build (`codeSets`) gives each set a head with a button group, one button per language in the order
   Pseudocode, Python, Java, C++, JavaScript, and the AI mark of each translated variant, and shows the
   pseudocode where the set has it, else Python (or the first language the set has); the shell shows the
   reader's code language of the book on every set
   (sections/codesets.ts). Pure: strings in, strings out. */
import { LISTING_LABELS, inOrder, isListingLang, parseMaker, pickLang, type ListingLang } from '../code/langs';
import { aiMarkHtml } from '../../components/ui/aimark';
import { aiByline } from './attribution';
import { type Locale, tIn } from '../i18n/index';

export type CodeVariant = { readonly lang: string; readonly ai?: string; readonly attrs: string; readonly body: string };
export type CodeSet = {
  readonly at: number; readonly length: number;
  readonly attrs: string; readonly noPython?: string;
  readonly variants: readonly CodeVariant[];
  /* what the set holds beside its <pre>s, which it may not */
  readonly stray: string;
};

const SET = /<div\b([^>]*\bclass="(?:[^"]*\s)?code-set(?:\s[^"]*)?"[^>]*)>([\s\S]*?)<\/div>/g;
const PRE = /<pre\b([^>]*)>([\s\S]*?)<\/pre>/g;
const attr = (attrs: string, name: string): string | undefined => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  if (m) return m[1];
  return new RegExp(`(?:^|\\s)${name}(?=[\\s/>]|$)`).test(attrs) ? '' : undefined;   /* written bare, it is empty */
};

/* Every code set of a text, in the order it prints them. */
export const codeSetsOf = (html: string): readonly CodeSet[] =>
  Array.from(html.matchAll(SET), (m) => {
    const inner = m[2];
    const variants = Array.from(inner.matchAll(PRE), ([, a, body]) => {
      const ai = attr(a, 'data-ai');
      return { lang: attr(a, 'data-lang') ?? '', ...(ai !== undefined ? { ai } : {}), attrs: a, body };
    });
    const noPython = attr(m[1], 'data-no-python');
    return { at: m.index ?? 0, length: m[0].length, attrs: m[1], ...(noPython !== undefined ? { noPython } : {}), variants, stray: inner.replace(PRE, '').trim() };
  });

/* What is wrong with one set, as the content check words it. */
export const codeSetIssues = (s: CodeSet): readonly string[] => {
  const out: string[] = [];
  if (s.stray) out.push(`holds "${s.stray.slice(0, 40)}" beside its <pre> elements, and a code set holds only <pre data-lang>`);
  if (!s.variants.length) out.push('holds no <pre data-lang>');
  const seen = new Set<string>();
  s.variants.forEach((v) => {
    if (!v.lang) out.push('has a <pre> with no data-lang');
    else if (!isListingLang(v.lang)) out.push(`has a <pre data-lang="${v.lang}">, and the languages are pseudocode, python, java, cpp and javascript`);
    else if (seen.has(v.lang)) out.push(`has two <pre data-lang="${v.lang}">`);
    seen.add(v.lang);
    if (v.ai !== undefined && parseMaker(v.ai) === null) out.push(`<pre data-lang="${v.lang}"> has data-ai="${v.ai}", which is not "<model id>" or "<model id> <low|medium|high|max>"`);
    /* the loader renders math before the check reads the text, so a "$" pair shows as KaTeX's markup */
    if (/\$|class="katex/.test(v.body)) out.push(`<pre data-lang="${v.lang}"> holds math, which code never does: a dollar sign in code is &#36;`);
    if (/<(?!\/?(?:code|span|b|i|em|strong|mark)\b)[a-z]/i.test(v.body)) out.push(`<pre data-lang="${v.lang}"> holds markup other than <code> and inline spans`);
  });
  if (!seen.has('python') && s.noPython === undefined) out.push('has no Python, which every set of code has; add it or say why in data-no-python');
  if (seen.has('python') && s.noPython !== undefined) out.push('has Python and says data-no-python');
  if (s.noPython !== undefined && !s.noPython.trim()) out.push('says data-no-python with no reason');
  return out;
};
/* What is worth a warning: a set every variant of which the AI wrote prints none of the source's code. */
export const codeSetWarnings = (s: CodeSet): readonly string[] =>
  s.variants.length && s.variants.every((v) => v.ai !== undefined) ? ['has no variant the source prints: every <pre> carries data-ai'] : [];

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const withoutHidden = (attrs: string): string => attrs.replace(/\s+hidden(?:="[^"]*")?(?=[\s>]|$)/g, '');

/* The set as the page prints it: its head, and every variant but the one shown hidden. */
export const renderCodeSet = (s: CodeSet, locale: Locale): string => {
  const known = s.variants.filter((v) => isListingLang(v.lang));
  const langs = inOrder(known.map((v) => v.lang));
  const shown: ListingLang = pickLang(langs, null);
  const variant = (l: ListingLang): CodeVariant => known.find((v) => v.lang === l)!;
  const byline = (v: CodeVariant): string | null => {
    if (v.ai === undefined) return null;
    const m = parseMaker(v.ai);
    return (m && aiByline([m], locale)) ?? tIn(locale, 'content.ai.mark');
  };
  const buttons = langs.length > 1
    ? `<span class="cs-langs" role="group" aria-label="${esc(tIn(locale, 'content.code.language'))}">${langs.map((l) =>
      `<button type="button" class="cs-lang${l === shown ? ' on' : ''}" data-lang="${l}" aria-pressed="${l === shown}">${esc(l === 'pseudocode' ? tIn(locale, 'content.code.pseudocode') : LISTING_LABELS[l])}</button>`).join('')}</span>`
    : '';
  const marks = langs.flatMap((l) => { const b = byline(variant(l)); return b === null ? [] : [`<span class="cs-ai" data-lang="${l}"${l === shown ? '' : ' hidden'}>${aiMarkHtml(b)}</span>`]; }).join('');
  const head = buttons || marks ? `<div class="cs-head">${buttons}${marks}</div>` : '';
  const pres = langs.map((l) => { const v = variant(l); return `<pre${withoutHidden(v.attrs)}${l === shown ? '' : ' hidden'}>${v.body}</pre>`; }).join('');
  return `<div${s.attrs} data-langs="${langs.join(' ')}" data-shown="${shown}">${head}${pres}</div>`;
};

/* Every code set of a text given its head; the rest of the text as it was. */
export const codeSets = (html: string, locale: Locale): string => {
  const sets = codeSetsOf(html);
  if (!sets.length) return html;
  let out = '', from = 0;
  sets.forEach((s) => { out += html.slice(from, s.at) + renderCodeSet(s, locale); from = s.at + s.length; });
  return out + html.slice(from);
};
