/* Speech input as the chat box uses it: whether it can run here, the language
   it listens in (the reader's choice, kept and synced with the other
   settings, else OmniStax's own), and one recognition at a time. The words
   heard go to whoever started it, the box that will put them in its field. */
import { readerWritesAllowed } from '../backup/guard';
import { host } from '../commands/host.svelte';
import { i18n } from '../i18n/store.svelte';
import { availability, heardOf, isDictationLang, listeningLang, recognitionOf, type Availability, type Recognition } from './dictation';

export const DICTATION_LANG_KEY = 'omnistax-dictation-lang';
const read = (): string => { try { const v = localStorage.getItem(DICTATION_LANG_KEY) ?? ''; return isDictationLang(v) ? v : ''; } catch { return ''; } };

/* Why a try stopped, for the box to say: the microphone refused, or the
   service out of reach. Any other end is a plain stop. */
export type Failure = 'denied' | 'network' | 'other';
const failureOf = (error: string): Failure | null =>
  error === 'not-allowed' || error === 'service-not-allowed' || error === 'audio-capture' ? 'denied'
    : error === 'network' ? 'network' : error === 'aborted' || error === 'no-speech' ? null : 'other';

type Listener = { readonly heard: (words: string) => void; readonly ended: (failure: Failure | null) => void };

class Dictation {
  /* The reader's language for speech input, '' to follow OmniStax's. */
  choice = $state(typeof localStorage === 'undefined' ? '' : read());
  online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);
  /* The box listening now, by the key it started with. */
  owner = $state<string | null>(null);
  private running: Recognition | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => { this.online = true; });
    window.addEventListener('offline', () => { this.online = false; this.stop(); });
  }

  get available(): Availability {
    return availability({ api: recognitionOf(typeof window === 'undefined' ? undefined : window) !== null, desktop: host.surface === 'desktop', online: this.online });
  }
  /* The tag it listens in now. */
  get lang(): string { return listeningLang(this.choice, i18n.locale, typeof navigator === 'undefined' ? [] : navigator.languages); }

  setChoice(tag: string): void {
    this.choice = isDictationLang(tag) ? tag : '';
    if (!readerWritesAllowed()) return;
    try { if (this.choice) localStorage.setItem(DICTATION_LANG_KEY, this.choice); else localStorage.removeItem(DICTATION_LANG_KEY); } catch { /* private mode */ }
  }

  /* Listen for one box; another box listening is stopped first. */
  start(owner: string, listener: Listener): void {
    const Ctor = recognitionOf(window);
    if (!Ctor || this.available !== 'ready') return;
    this.stop();
    const r = new Ctor();
    r.lang = this.lang; r.continuous = true; r.interimResults = true;
    let failure: Failure | null = null;
    /* The last words can arrive after a stop, before the end: they still count. */
    r.onresult = (e) => listener.heard(heardOf(e));
    r.onerror = (e) => { failure = failureOf(e.error) ?? failure; };
    r.onend = () => {
      if (this.running === r) { this.running = null; this.owner = null; }
      listener.ended(failure);
    };
    this.running = r; this.owner = owner;
    try { r.start(); } catch { this.running = null; this.owner = null; listener.ended('other'); }
  }
  /* Stop listening; what was heard so far stays where it was put. */
  stop(): void { const r = this.running; if (!r) return; this.running = null; this.owner = null; try { r.stop(); } catch { /* already over */ } }
  listening(owner: string): boolean { return this.owner === owner; }
}
export const dictation = new Dictation();
