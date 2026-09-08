/* Which shell dialog is open: the command palette, the Open browser or the
   settings page, never two at once. Commands open them, the Rail opens them,
   Escape and outside clicks close them. */

export type PaletteState = { readonly open: boolean; readonly query: string; readonly group: number | null };
export type BrowserState = { readonly open: boolean; readonly group: number | null };
const PALETTE_CLOSED: PaletteState = { open: false, query: '', group: null };
const BROWSER_CLOSED: BrowserState = { open: false, group: null };

class Ui {
  palette = $state.raw<PaletteState>(PALETTE_CLOSED);
  browser = $state.raw<BrowserState>(BROWSER_CLOSED);
  settings = $state(false);

  /* `group` is the document group a section should open into (the "+" on a tab strip passes its own). */
  openPalette(query = '', opts: { group?: number } = {}): void { this.settings = false; this.closeBrowser(); this.palette = { open: true, query, group: opts.group ?? null }; }
  closePalette(): void { if (this.palette.open) this.palette = PALETTE_CLOSED; }
  togglePalette(query = ''): void { if (this.palette.open) this.closePalette(); else this.openPalette(query); }
  openBrowser(opts: { group?: number } = {}): void { this.settings = false; this.closePalette(); this.browser = { open: true, group: opts.group ?? null }; }
  closeBrowser(): void { if (this.browser.open) this.browser = BROWSER_CLOSED; }
  toggleBrowser(): void { if (this.browser.open) this.closeBrowser(); else this.openBrowser(); }
  openSettings(): void { this.closePalette(); this.closeBrowser(); this.settings = true; }
  toggleSettings(): void { if (this.settings) this.settings = false; else this.openSettings(); }
  closeAll(): void { this.closePalette(); this.closeBrowser(); this.settings = false; }
  get anyOpen(): boolean { return this.palette.open || this.browser.open || this.settings; }
}
export const ui = new Ui();
