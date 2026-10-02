/* Reading a book's text off the build, for a book other than the one being
   read: the manifest and the concepts are read the way a practice session reads
   them (practice/books.ts), and this file sits beside them. It is read
   leniently, a row that will not parse dropped rather than the book, since a
   book half-searched beats one not searched at all. Pure. */
import type { TextBlockDTO, TextIndexDTO, TextPageDTO } from '../content/textindex';

const obj = (raw: unknown): Record<string, unknown> | null => (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);

const parseBlock = (raw: unknown): TextBlockDTO[] => {
  const o = obj(raw); if (!o || !str(o.text)) return [];
  return [{ span: str(o.span), head: str(o.head), text: str(o.text), toks: str(o.toks) }];
};
const parsePage = (raw: unknown): TextPageDTO[] => {
  const o = obj(raw); if (!o || !str(o.id)) return [];
  /* A page's dictionary and a block's pointers into it are read as leniently as the rest:
     where either is missing or bent, the index tokenises the text itself. */
  const terms = arr(o.terms).flatMap((t) => (typeof t === 'string' && t !== '' ? [t] : []));
  return [{ id: str(o.id), title: str(o.title), url: str(o.url), chapter: str(o.chapter), terms, blocks: arr(o.blocks).flatMap(parseBlock) }];
};
/* A book's search.json: its pages in reading order, each with its blocks. */
export const parseIndex = (raw: unknown): TextIndexDTO => ({ pages: arr(obj(raw)?.pages).flatMap(parsePage) });
