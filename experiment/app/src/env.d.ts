/// <reference types="astro/client" />
declare module 'katex/contrib/auto-render' {
  import type { KatexOptions } from 'katex';
  type Delimiter = { left: string; right: string; display: boolean };
  export default function renderMathInElement(el: HTMLElement, options?: KatexOptions & { delimiters?: Delimiter[] }): void;
}
