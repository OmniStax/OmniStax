/* The code sets of a prepared text (content/codeset.ts): each shows the reader's code language of its book,
   where it has it, and a click on one of its buttons makes that the book's language, so every set and every
   figure's code panel of the book follows (settings/codelang.ts). The build printed each set showing Python;
   this only moves `hidden` and the pressed state. */
import { inOrder, isListingLang, pickLang, type ListingLang } from '../code/langs';
import { codeLangOf, onCodeLang, setCodeLang } from '../settings/codelang';

/* one set shows one language: its <pre>, its AI mark where it has one, its button pressed */
export const showCodeSet = (set: HTMLElement, preferred: ListingLang): ListingLang => {
  const langs = inOrder((set.dataset.langs ?? '').split(/\s+/));
  const l = pickLang(langs, preferred);
  set.querySelectorAll<HTMLElement>(':scope > pre[data-lang]').forEach((p) => { p.hidden = p.dataset.lang !== l; });
  set.querySelectorAll<HTMLElement>(':scope > .cs-head .cs-ai').forEach((m) => { m.hidden = m.dataset.lang !== l; });
  set.querySelectorAll<HTMLButtonElement>(':scope > .cs-head .cs-lang').forEach((b) => {
    const on = b.dataset.lang === l; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
  });
  set.dataset.shown = l;
  return l;
};

/* the roots prepared, each with its book, held weakly so a closed page goes */
const roots = new Set<WeakRef<HTMLElement>>();
let listening = false;
const listen = (): void => {
  if (listening) return;
  listening = true;
  onCodeLang((book, lang) => roots.forEach((w) => {
    const r = w.deref(); if (!r) { roots.delete(w); return; }
    if ((r.dataset.book ?? '') === book) r.querySelectorAll<HTMLElement>('.code-set[data-langs]').forEach((s) => showCodeSet(s, lang));
  }));
};

/* A text the shell has just adopted: its sets show the book's language and their buttons choose it. */
export function codeSets(root: HTMLElement, book: string): void {
  const sets = root.querySelectorAll<HTMLElement>('.code-set[data-langs]');
  if (!sets.length || root.dataset.codeSets) return;
  root.dataset.codeSets = '1';
  if (!root.dataset.book) root.dataset.book = book;
  const lang = codeLangOf(book);
  sets.forEach((s) => showCodeSet(s, lang));
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('.code-set .cs-lang');
    const l = b?.dataset.lang;
    if (!b || !root.contains(b) || !isListingLang(l)) return;
    setCodeLang(root.dataset.book ?? book, l);
  });
  listen();
  roots.add(new WeakRef(root));
}
