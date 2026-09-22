/* The AI block as a live value: the reader's choice, read back from this
   browser at boot and written as they change it. What the record means and how
   it is read leniently is in `settings.ts` beside this, which is pure. */
import { readerWritesAllowed } from '../backup/guard';
import { AI_KEY, defaultAi, parseAi } from './settings';
import type { AiSettings, ProviderId } from './providers/index';

class Ai {
  value = $state.raw<AiSettings>(defaultAi());

  init(): void { try { this.value = parseAi(JSON.parse(localStorage.getItem(AI_KEY) ?? 'null')); } catch { this.value = defaultAi(); } }

  get provider(): ProviderId { return this.value.provider; }
  get model(): string { return this.value.models[this.value.provider] ?? ''; }
  get key(): string { return this.value.keys[this.value.provider] ?? ''; }
  /* Whether a question can be asked at all: a host of the reader's own may
     serve no key, so only the others insist on one. */
  get ready(): boolean {
    const s = this.value;
    if (s.provider === 'compatible') return s.baseUrl.trim() !== '' && this.model.trim() !== '';
    return this.key.trim() !== '' && this.model.trim() !== '';
  }

  setProvider(provider: ProviderId): void { this.write({ ...this.value, provider }); }
  setModel(id: ProviderId, model: string): void { this.write({ ...this.value, models: { ...this.value.models, [id]: model } }); }
  setKey(id: ProviderId, key: string): void { this.write({ ...this.value, keys: { ...this.value.keys, [id]: key } }); }
  setBaseUrl(baseUrl: string): void { this.write({ ...this.value, baseUrl }); }

  private write(next: AiSettings): void {
    this.value = next;
    if (!readerWritesAllowed()) return;
    try { localStorage.setItem(AI_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  }
}
export const ai = new Ai();
