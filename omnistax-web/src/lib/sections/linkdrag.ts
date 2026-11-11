/* A link to a page of OmniStax can be dragged like a tab. The browser already
   drags a link; here the drag is also handed to the layout, so a tab strip, a
   group's body or one of its edges takes it and the page opens there, as a tab
   or in a split of its own, and then scrolls to the place the link named.

   Three kinds of link name a page: an address of a book's page or sheet
   (`/college-physics-2e/ch02/2.1/#fig-3`), a link to a place in a page that is
   already open (`#2.1-fig-3`), and a wiki link in a note or a chat to a
   section, a note, a drawing, a file or a chat. The drag has to be claimed as
   it starts, so a book whose contents have not been fetched yet is fetched for
   the next try and this one is left to the browser. */
import { refOfPath, sectionOfUrl } from '../content/urls';
import { beginDrag, dragging, endDrag, type Drag } from '../layout/drag.svelte';
import { sheets } from '../sheets/store.svelte';
import { fileOpens } from '../files/open.svelte';
import { bookId, docItem, itemKey, parseItemKey, parseSecKey, sectionId, sectionRef, sheetId, sheetItem, type BookId } from '../types/ids';
import { focus } from './focus.svelte';
import { bookOfEl, findEl, jump } from './nav.svelte';
import { registry } from './registry.svelte';

type Dragged = Pick<Drag, 'key' | 'dropped'>;

/* The place a link named, once the page that holds it has been drawn: the tab
   may be a moment from mounting when the drop returns. */
const land = (book: BookId, id: string, tries = 40): void => {
  if (!id) return;
  const el = findEl(book, id);
  if (el) { jump(el); return; }
  if (tries > 0) requestAnimationFrame(() => land(book, id, tries - 1));
};

const ofWiki = (link: string): Dragged | null => {
  const sec = /^section:(.+)$/.exec(link);
  if (sec) {
    const ref = parseSecKey(sec[1]) ?? (focus.book ? sectionRef(focus.book, sectionId(sec[1])) : null);
    return ref ? { key: itemKey(docItem(ref, 'text')) } : null;
  }
  /* a file may name a page and a chat a message; the tab is the file or the chat */
  const own = /^(note|drawing|chat|file):([^:]+)(?::p(\d+))?/.exec(link);
  if (!own) return null;
  const id = parseItemKey(`${own[1]}:${own[2]}`);
  if (!id) return null;
  const page = own[1] === 'file' && own[3] ? Number(own[3]) : undefined;
  return { key: itemKey(id), dropped: id.kind === 'file' && page !== undefined ? () => fileOpens.askPage(id.file, page) : undefined };
};

const ofHash = (a: Element, hash: string): Dragged | null => {
  const id = decodeURIComponent(hash.slice(1)); const book = bookOfEl(a);
  if (!id || !book) return null;
  const sec = findEl(book, id)?.closest<HTMLElement>('article[data-doc]')?.dataset.doc?.split('/')[0];
  return sec ? { key: itemKey(docItem(sectionRef(book, sectionId(sec)), 'text')), dropped: () => land(book, id) } : null;
};

const ofAddress = (href: string): Dragged | null => {
  let url: URL;
  try { url = new URL(href, location.href); } catch { return null; }
  if (url.origin !== location.origin) return null;
  const at = refOfPath(url.pathname);
  if (!at) return null;
  if (!registry.hasBook(at.book)) { void registry.ensureBook(at.book); return null; }
  const m = registry.manifest(at.book);
  const sheet = at.chapterDir === 'sheets' ? m.sheets.find((s) => s.id === at.section) : undefined;
  if (sheet) {
    const exprs = url.searchParams.getAll('expr');
    return { key: itemKey(sheetItem(at.book, sheetId(sheet.id))), dropped: exprs.length ? () => sheets.ask(at.book, sheet.id, exprs) : undefined };
  }
  const sec = sectionOfUrl(m, url.pathname);
  if (!sec) return null;
  const ref = sectionRef(at.book, sec); const id = decodeURIComponent(url.hash.slice(1));
  return { key: itemKey(docItem(ref, 'text')), dropped: () => { void registry.load(ref).then(() => land(bookId(at.book), id)); } };
};

/* The page a link opens, or null for a link that leaves OmniStax or names nothing. */
export const pageOfLink = (a: Element): Dragged | null => {
  const wiki = a.matches('a.wiki[data-link]') ? (a as HTMLElement).dataset.link : undefined;
  if (wiki) return ofWiki(wiki);
  const href = a.getAttribute('href') ?? '';
  if (!href || a.getAttribute('target')) return null;
  return href.startsWith('#') ? ofHash(a, href) : ofAddress(href);
};

/* Listen on the document for a link picked up anywhere. A drag something else
   has claimed is left alone: a tab or a row of the explorer is the layout's
   already, and a card dragged out of a panel is on its way into a note. */
export const installLinkDrag = (): (() => void) => {
  let mine = false;
  const start = (e: DragEvent): void => {
    if (dragging() || document.documentElement.classList.contains('dragging-out')) return;
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
    const page = a ? pageOfLink(a) : null;
    if (!page) return;
    mine = true;
    beginDrag({ ...page, from: null });
  };
  const end = (): void => { if (mine) { mine = false; endDrag(); } };
  document.addEventListener('dragstart', start);
  document.addEventListener('dragend', end);
  return () => { document.removeEventListener('dragstart', start); document.removeEventListener('dragend', end); end(); };
};
