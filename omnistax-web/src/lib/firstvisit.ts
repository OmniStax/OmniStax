/* Whether this is the reader's first visit ever: no OmniStax data in this
   browser. Read once, when the loader first imports it, before any store has
   written a key of its own. The release notes and the reader's language are
   decided by it (releases/start.ts, i18n/store.svelte.ts). */
export const firstVisit = ((): boolean => {
  try { return !Object.keys(localStorage).some((k) => k.startsWith('omnistax-')); } catch { return false; }
})();
