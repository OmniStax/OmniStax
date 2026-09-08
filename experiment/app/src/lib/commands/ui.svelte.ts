/* Which shell dialog is open: the palette or the settings page, never both.
   Commands open them, the Rail opens them, Escape and outside clicks close them. */
import type { CommandGroup } from './command';

export type PaletteState = { readonly open: boolean; readonly query: string; readonly scope: CommandGroup | null; readonly group: number | null };
const CLOSED: PaletteState = { open: false, query: '', scope: null, group: null };

class Ui {
  palette = $state.raw<PaletteState>(CLOSED);
  settings = $state(false);

  /* `scope` limits the list to one command group; `group` is the document group
     a section should open into (the "+" on a tab strip passes its own). */
  openPalette(query = '', opts: { scope?: CommandGroup; group?: number } = {}): void {
    this.settings = false;
    this.palette = { open: true, query, scope: opts.scope ?? null, group: opts.group ?? null };
  }
  closePalette(): void { if (this.palette.open) this.palette = CLOSED; }
  togglePalette(query = ''): void { if (this.palette.open) this.closePalette(); else this.openPalette(query); }
  openSettings(): void { this.closePalette(); this.settings = true; }
  toggleSettings(): void { if (this.settings) this.settings = false; else this.openSettings(); }
  closeAll(): void { this.closePalette(); this.settings = false; }
  get anyOpen(): boolean { return this.palette.open || this.settings; }
}
export const ui = new Ui();
