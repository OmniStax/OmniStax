/* Release-note versions and what the app shows when it starts. A version is
   YYYY.MM.DD.MICRO, MICRO counting the releases of that day: a label in date
   order, not semver (docs/release-plan.md, decision 6). */
export type Version = string & { readonly __brand: 'Version' };
export const VERSION = /^\d{4}\.(1[0-2]|[1-9])\.([1-9]|[12]\d|3[01])\.\d+$/;
export const version = (s: string): Version | null => (VERSION.test(s) ? (s as Version) : null);
export const compareVersions = (a: Version, b: Version): number => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  return x.reduce((d, n, i) => d || n - y[i], 0);
};

/* fresh: no OmniStax data at all, a first visit, shown the page it came for
   and the About tab beside it. notes: release notes the reader has not seen.
   Data with no seen version is a reader from before notes, who gets them once. */
export type Start = 'fresh' | 'notes' | 'none';
export const startOf = (hasData: boolean, seen: Version | null, newest: Version | null): Start =>
  !hasData ? 'fresh' : newest && (!seen || compareVersions(seen, newest) < 0) ? 'notes' : 'none';
