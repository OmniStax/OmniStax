/* The colours a drawing is made in: fifteen swatches, the same for every
   drawing, kept in this browser. The first is ink, which follows the theme
   so that black on the light page reads white on the dark one; the fourteen
   after it are the reader's to change, for good, from the toolbar. A stroke
   keeps the colour it was drawn in: changing a swatch changes what is drawn
   next, never what was drawn. */
import { readerWritesAllowed } from '../backup/guard';
import type { Colour } from './colour';

const KEY = 'omnistax-drawing-palette-v1';
export const DEFAULT_PALETTE: readonly Colour[] = [
  'ink', '#6b7280', '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#16a34a', '#0d9488',
  '#0891b2', '#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#92400e', '#f8fafc',
];
export const PALETTE_SIZE = DEFAULT_PALETTE.length;
const HEX = /^#[0-9a-f]{6}$/i;

const read = (): readonly Colour[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!Array.isArray(raw) || raw.length !== PALETTE_SIZE) return DEFAULT_PALETTE;
    return raw.map((c, i) => (i === 0 ? 'ink' : typeof c === 'string' && HEX.test(c) ? c.toLowerCase() : DEFAULT_PALETTE[i]));
  } catch { return DEFAULT_PALETTE; }
};

class Palette {
  colours = $state.raw<readonly Colour[]>(typeof localStorage === 'undefined' ? DEFAULT_PALETTE : read());
  /* Ink stays ink; any other swatch takes the hex it is given. */
  set(i: number, hex: string): void {
    if (i <= 0 || i >= PALETTE_SIZE || !HEX.test(hex)) return;
    this.colours = this.colours.map((c, k) => (k === i ? hex.toLowerCase() : c));
    if (!readerWritesAllowed()) return;
    try { localStorage.setItem(KEY, JSON.stringify(this.colours)); } catch { /* private mode */ }
  }
  reset(): void { this.colours = DEFAULT_PALETTE; try { localStorage.removeItem(KEY); } catch { /* private mode */ } }
}
export const palette = new Palette();
