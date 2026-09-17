/* Reading a document aloud with the browser's speech synthesis. Two parts: the
   text a rendered article should be read as (prose and headings; figures,
   exercise cards and chrome skipped; maths read as its TeX source, which is what
   the KaTeX annotation carries), and a small speaker over window.speechSynthesis
   that queues one utterance per paragraph so long sections are not cut short. */
export type Speaker = {
  readonly start: (text: string) => void;
  readonly stop: () => void;
  readonly speaking: () => boolean;
};

/* Not read: figures and sims, exercise cards, transport chrome, KaTeX's visual branch. */
const SKIP = 'figure, .exercises, .sim, .photo, .katex-html, .fig-split, .footer, .transport, .controls, .readout, script, style, button, nav';
const BLOCKS = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'TR', 'DT', 'DD']);
const TEXT_NODE = 3, ELEMENT_NODE = 1;

export const readableText = (root: Element): string => {
  const parts: string[] = [];
  const walk = (n: Node): void => {
    if (n.nodeType === TEXT_NODE) { parts.push(n.textContent ?? ''); return; }
    if (n.nodeType !== ELEMENT_NODE) return;
    const el = n as Element;
    if (el.matches(SKIP)) return;
    if (el.classList.contains('katex')) { parts.push(' ', el.querySelector('annotation')?.textContent ?? '', ' '); return; }
    const block = BLOCKS.has(el.tagName);
    if (block) parts.push('\n');
    el.childNodes.forEach(walk);
    if (block) parts.push('\n');
  };
  walk(root);
  return parts.join('').split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
};

export const speechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';

export const createSpeaker = (onChange: (speaking: boolean) => void = () => {}): Speaker => {
  let run = 0;           /* a token per start, so a cancelled run's callbacks are ignored */
  let speaking = false;
  const set = (v: boolean) => { if (speaking === v) return; speaking = v; onChange(v); };
  const stop = () => { run += 1; if (speechSupported()) window.speechSynthesis.cancel(); set(false); };
  const start = (text: string) => {
    stop(); if (!speechSupported()) return;
    const paragraphs = text.split('\n').filter(Boolean); if (!paragraphs.length) return;
    const mine = run; set(true);
    paragraphs.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = document.documentElement.lang || 'en';
      const done = () => { if (mine === run && i === paragraphs.length - 1) set(false); };
      u.onend = done; u.onerror = done;
      window.speechSynthesis.speak(u);
    });
  };
  return { start, stop, speaking: () => speaking };
};
