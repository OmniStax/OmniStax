/* pdf.js on demand. The library and its worker together are nearly two
   megabytes, which no page needs until the reader opens a PDF, so they are
   vendored under `public/vendor/pdfjs/` and fetched the first time a file tab
   asks — the way `fig/three.ts` fetches three.js, and for the same reason.
   Nothing of pdf.js is in the app bundle: the import below is a dynamic import
   of a URL string, which the bundler leaves alone.

   The version that was copied in is recorded in `public/vendor/pdfjs/VERSION`
   beside the two files. */

/* The little of pdf.js the app uses, named here so that nothing downstream
   reaches into an `any`. The library's own types are not vendored with it. */
export type TextItem = { readonly str: string; readonly transform: readonly number[] };
export type TextContent = { readonly items: readonly TextItem[] };
export type Viewport = { readonly width: number; readonly height: number };
export type RenderTask = { readonly promise: Promise<void>; cancel(): void };
export type PdfPage = {
  readonly pageNumber: number;
  getViewport(o: { scale: number }): Viewport;
  getTextContent(): Promise<TextContent>;
  render(o: { canvasContext: CanvasRenderingContext2D; viewport: Viewport }): RenderTask;
};
export type PdfDoc = { readonly numPages: number; getPage(n: number): Promise<PdfPage>; destroy(): Promise<void> };
export type DocOptions = { data: ArrayBuffer; standardFontDataUrl?: string };
export type Pdfjs = {
  getDocument(o: DocOptions): { readonly promise: Promise<PdfDoc>; destroy(): Promise<void> };
  GlobalWorkerOptions: { workerSrc: string };
};

export const PDFJS_URL = '/vendor/pdfjs/pdf.min.mjs';
export const PDFJS_WORKER_URL = '/vendor/pdfjs/pdf.worker.min.mjs';
/* The fourteen fonts every PDF may name without carrying: Helvetica, Times and
   the rest. Without them a document that names one is drawn in whatever the
   engine happens to substitute, so they are vendored beside the library. */
export const PDFJS_FONTS_URL = '/vendor/pdfjs/standard_fonts/';

/* One fetch however many askers, kept for the life of the page. */
let pending: Promise<Pdfjs> | null = null;

export const loadPdfjs = (): Promise<Pdfjs> => {
  if (pending) return pending;
  pending = import(/* @vite-ignore */ PDFJS_URL)
    .then((mod: unknown) => {
      const lib = mod as Pdfjs;
      /* The worker is where the parsing happens, so extraction and rendering
         are off the main thread as far as pdf.js allows. */
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return lib;
    })
    .catch((e: unknown) => { pending = null; throw e instanceof Error ? e : new Error('pdf.js failed to load'); });
  return pending;
};

/* One document, opened from bytes the blob store handed over. The caller owns
   it and destroys it when the tab closes. */
export const openPdf = async (bytes: ArrayBuffer): Promise<PdfDoc> => {
  const lib = await loadPdfjs();
  return lib.getDocument({ data: bytes, standardFontDataUrl: PDFJS_FONTS_URL }).promise;
};
