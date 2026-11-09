/* The calculator as the page reads it: one request to the engine and the answer
   it gives, through the one Python worker (py/host.ts), and the small pure
   pieces the page draws with (a step's sentence split into text and formulas,
   the grapher's address, the expression an address carries). */
import { askPython, PyError } from '../py/host';
import { t } from '../i18n';

export type CasOp = 'integral' | 'derivative';
export type CasRequest = {
  readonly op: CasOp; readonly text: string;
  readonly lower?: string; readonly upper?: string;
  /* only set the input as TeX, which is what the preview asks */
  readonly preview?: boolean;
};
/* One step of the working: a sentence, the equation it arrives at, and the steps that work out its parts. */
export type CasStep = { readonly say: string; readonly math: string; readonly sub: readonly CasStep[] };
export type CasAnswer = {
  readonly ok: true; readonly op: CasOp; readonly input: string; readonly variable: string;
  /* null where no closed form was found */
  readonly result: string | null;
  /* null where the answer was found without step-by-step working */
  readonly steps: readonly CasStep[] | null;
  /* the expression and its answer in the input's notation, for the grapher */
  readonly graph: readonly string[];
};
export type CasPreview = { readonly ok: true; readonly input: string };
export type CasRefusal = { readonly ok: false; readonly error: string };
export type CasReply = CasAnswer | CasPreview | CasRefusal;

/* A request SymPy has not answered by then is abandoned with its worker. */
export const TIMEOUT_MS = 20000;

export const ask = (q: CasRequest): Promise<CasReply> =>
  askPython('cas', JSON.stringify(q), TIMEOUT_MS).then(
    (reply) => JSON.parse(reply) as CasReply,
    (e: unknown) => { throw new Error(t(e instanceof PyError && e.reason === 'timeout' ? 'sheets.cas.timeout' : 'sheets.cas.loadFailed')); },
  );

/* A step's sentence, "Substitute $u = x^2$", as text and formulas in turn. */
export type Piece = { readonly tex: boolean; readonly s: string };
export const pieces = (say: string): readonly Piece[] =>
  say.split('$').map((s, i) => ({ tex: i % 2 === 1, s })).filter((p) => p.s !== '');

/* The grapher with these expressions drawn, one `expr` each. */
export const graphHref = (page: string, exprs: readonly string[]): string => {
  const q = new URLSearchParams(exprs.map((e) => ['expr', e] as [string, string]));
  return `${page}?${q.toString()}`;
};
/* The expression an address hands this page, if it hands one. */
export const exprOf = (search: string): string | null => new URLSearchParams(search).get('expr');
