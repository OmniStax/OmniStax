/* Reading a book's formula sheet and its text off the build, for a book other
   than the one being read: the manifest and the concepts are read the way a
   practice session reads them (practice/books.ts), and these two files sit
   beside them. Both are read leniently, a row that will not parse dropped
   rather than the book, since a book half-searched beats one not searched at
   all. Pure. */
import type { EquationDTO, FormulasDTO, GlossaryDTO, VariableDTO } from '../content/schema';
import type { TextBlockDTO, TextIndexDTO, TextPageDTO } from '../content/textindex';
import { equationId, sectionId, spanId, typeId } from '../types/ids';

const obj = (raw: unknown): Record<string, unknown> | null => (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);

const parseVariable = (raw: unknown): VariableDTO[] => {
  const o = obj(raw); if (!o || !str(o.sym) || !str(o.section)) return [];
  return [{ sym: str(o.sym), type: str(o.type) ? typeId(str(o.type)) : undefined, meaning: str(o.meaning), unit: str(o.unit), section: sectionId(str(o.section)), anchor: str(o.anchor) ? spanId(str(o.anchor)) : undefined }];
};
const parseTerm = (raw: unknown): GlossaryDTO[] => {
  const o = obj(raw); if (!o || !str(o.term) || !str(o.section)) return [];
  return [{ term: str(o.term), definition: str(o.definition), section: sectionId(str(o.section)) }];
};
const parseEquation = (raw: unknown): EquationDTO[] => {
  const o = obj(raw); if (!o || !str(o.id) || !str(o.section)) return [];
  return [{ id: equationId(str(o.id)), section: sectionId(str(o.section)), tex: str(o.tex), latex: str(o.latex) || str(o.tex), condition: str(o.condition) || undefined, anchor: str(o.anchor) ? spanId(str(o.anchor)) : undefined, important: o.important === true }];
};
/* A chapter's formulas.json: its symbols, its equations and its terms. */
export const parseFormulas = (raw: unknown): FormulasDTO => {
  const o = obj(raw);
  return { variables: arr(o?.variables).flatMap(parseVariable), equations: arr(o?.equations).flatMap(parseEquation), glossary: arr(o?.glossary).flatMap(parseTerm) };
};

const parseBlock = (raw: unknown): TextBlockDTO[] => {
  const o = obj(raw); if (!o || !str(o.text)) return [];
  return [{ span: str(o.span), head: str(o.head), text: str(o.text) }];
};
const parsePage = (raw: unknown): TextPageDTO[] => {
  const o = obj(raw); if (!o || !str(o.id)) return [];
  return [{ id: str(o.id), title: str(o.title), url: str(o.url), chapter: str(o.chapter), blocks: arr(o.blocks).flatMap(parseBlock) }];
};
/* A book's search.json: its pages in reading order, each with its blocks. */
export const parseIndex = (raw: unknown): TextIndexDTO => ({ pages: arr(obj(raw)?.pages).flatMap(parsePage) });
