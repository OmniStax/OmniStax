/* Walking the shell into another book: Shell sets the walk, the crumb bar calls it. */
const KEY = 'omnistax-last-page-v1';

const read = (): Record<string, unknown> => {
  try { const o: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return typeof o === 'object' && o !== null ? (o as Record<string, unknown>) : {}; } catch { return {}; }
};
export const lastPage = (book: string): string | undefined => { const u = read()[book]; return typeof u === 'string' ? u : undefined; };
export const rememberPage = (book: string, url: string): void => {
  try { localStorage.setItem(KEY, JSON.stringify({ ...read(), [book]: url })); } catch { /* private mode */ }
};

let walk: (book: string) => Promise<boolean> = async () => false;
export const setBookWalk = (f: (book: string) => Promise<boolean>): void => { walk = f; };
export const walkToBook = (book: string): Promise<boolean> => walk(book);
