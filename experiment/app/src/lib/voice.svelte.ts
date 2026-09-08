/* The reader the shell shares: reads the focused pane's document aloud, and
   says whether it is speaking so the Rail button and the commands can react. */
import { createSpeaker, readableText, speechSupported } from './voice';
import { layoutStore } from './layout/store.svelte';
import { activePane } from './sections/nav.svelte';

class Reader {
  speaking = $state(false);
  readonly supported = speechSupported();
  private speaker = createSpeaker((v) => { this.speaking = v; });

  /* The article in the focused group's active pane, if that pane shows a document. */
  focusedArticle(): HTMLElement | null { return activePane(layoutStore.layout.focus)?.querySelector<HTMLElement>('article[data-doc]') ?? null; }
  readFocused(): void { const a = this.focusedArticle(); if (a) this.speaker.start(readableText(a)); }
  stop(): void { this.speaker.stop(); }
  toggle(): void { if (this.speaking) this.stop(); else this.readFocused(); }
}
export const reader = new Reader();
