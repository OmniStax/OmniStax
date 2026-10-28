/* What a line of a synced file names, in the reader's own words. A record
   holds the reader's things by their keys — the practice record files a note
   beside its exercise as `note:5f2y0vbb` — and the diff shows the file as it
   is, so each key a line carries is glossed with the name the thing goes by
   now, which a rename changes at once. Pure: the names are asked of the
   caller. */
export type OwnKind = 'note' | 'drawing' | 'chat' | 'file';
const KEY = /\b(note|drawing|chat|file):([a-z0-9]{8})\b/g;

export const glossOf = (line: string, nameOf: (kind: OwnKind, id: string) => string | undefined): string | null => {
  const names = [...line.matchAll(KEY)].flatMap((m) => { const n = nameOf(m[1] as OwnKind, m[2]); return n ? [n] : []; });
  return names.length ? names.join(', ') : null;
};
