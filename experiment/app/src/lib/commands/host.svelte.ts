/* The host this page runs in, watched: the browser family from its user agent,
   and whether the window is a plain tab, an installed app or full screen, which
   decides which chords ever arrive (see host.ts). Chromium offers to install the
   book once the manifest is seen; the offer is held here for the settings page
   to show as a button, and forgotten once the book is installed. */
import { browserOf, type Browser, type Surface, type Host as HostInfo } from './host';
export { kept, keptChords, hostName, RESERVED, BROWSER_NAMES } from './host';
export type { Browser, Surface } from './host';

type InstallPrompt = Event & { prompt(): Promise<unknown> };
const inBrowser = typeof window !== 'undefined';

const surfaceNow = (): Surface => {
  if (!inBrowser) return 'tab';
  if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches) return 'app';
  if (document.fullscreenElement || matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
  return 'tab';
};

class Host {
  readonly browser: Browser = inBrowser ? browserOf(navigator.userAgent) : 'other';
  surface = $state<Surface>(surfaceNow());
  #offer = $state.raw<InstallPrompt | null>(null);

  constructor() {
    if (!inBrowser) return;
    const refresh = () => { this.surface = surfaceNow(); };
    ['(display-mode: standalone)', '(display-mode: fullscreen)', '(display-mode: window-controls-overlay)'].forEach((q) => matchMedia(q).addEventListener('change', refresh));
    document.addEventListener('fullscreenchange', refresh);
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.#offer = e as InstallPrompt; });
    window.addEventListener('appinstalled', () => { this.#offer = null; });
  }
  get info(): HostInfo { return { browser: this.browser, surface: this.surface }; }
  get canInstall(): boolean { return this.#offer !== null; }
  /* Put the browser's install dialog up; the offer is spent either way. */
  async install(): Promise<void> { const o = this.#offer; if (!o) return; this.#offer = null; try { await o.prompt(); } catch { /* dismissed */ } }
}
export const host = new Host();
