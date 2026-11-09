/* The shell's reactive view of the reader's code language per book (codelang.ts): the Theme page and a code
   exercise card read it here and follow a change made by any listing, in this tab or another. */
import type { ListingLang } from '../code/langs';
import { codeLangOf, onCodeLang, setCodeLang } from './codelang';

class CodeLangs {
  /* bumped on every change, so a reader of `of` re-runs */
  private tick = $state(0);
  constructor() { onCodeLang(() => { this.tick += 1; }); }
  of(book: string): ListingLang { void this.tick; return codeLangOf(book); }
  set(book: string, lang: ListingLang): void { setCodeLang(book, lang); }
}
export const codeLangs = new CodeLangs();
