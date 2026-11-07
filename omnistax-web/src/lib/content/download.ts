/* The desktop installers the Download page offers. The files are the newest
   GitHub release that has installers (docs/release-plan.md, decision 9), at
   names that never change, so the page never does either. */
export const RELEASES = 'https://github.com/OmniStax/OmniStax/releases';
export const SYSTEMS = [
  { id: 'windows', name: 'Windows', file: 'OmniStax-Setup.exe' },
  { id: 'mac', name: 'macOS', file: 'OmniStax.dmg' },
  { id: 'linux', name: 'Linux', file: 'OmniStax.AppImage' },
] as const;
export type SystemId = (typeof SYSTEMS)[number]['id'];

/* The reader's own system, from the browser's user agent; null where it is none of the three (a phone, say). */
export const systemOf = (ua: string): SystemId | null =>
  /Windows/.test(ua) ? 'windows' : /Mac/.test(ua) && !/iPhone|iPad/.test(ua) ? 'mac' : /Linux|X11/.test(ua) && !/Android/.test(ua) ? 'linux' : null;

/* Put the reader's own system first in a Download page's list, and mark it as the one to take. */
export const preferOwnSystem = (root: ParentNode, ua: string): void => {
  const os = systemOf(ua);
  const li = os ? root.querySelector<HTMLElement>(`[data-os="${os}"]`) : null;
  if (!li) return;
  li.parentElement?.prepend(li);
  li.classList.add('own');
};
