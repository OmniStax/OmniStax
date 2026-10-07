/* The AI block as a live value, read back from this browser at boot and
   written as the reader changes it. What the record means and how it is read
   leniently is in `settings.ts` beside this, which is pure. */
import { readerWritesAllowed } from '../backup/guard';
import { ui } from '../commands/ui.svelte';
import { AI_KEY, accessOf, defaultAi, menuOf, parseAi, readyPick, toggleShown, type AiSettings, type Endpoint, type EndpointId, type MenuGroup } from './settings';
import type { Access, CloudId, ModelPick, ProviderId } from './providers/index';

const newEndpointId = (): EndpointId => Math.random().toString(36).slice(2, 10);

class Ai {
  value = $state.raw<AiSettings>(defaultAi());
  init(): void { try { this.value = parseAi(JSON.parse(localStorage.getItem(AI_KEY) ?? 'null')); } catch { this.value = defaultAi(); } }

  get inlineHtml(): boolean { return this.value.inlineHtml; }
  get last(): ModelPick | null { return this.value.last; }
  get ready(): ModelPick | null { return readyPick(this.value, this.value.last); }
  get menu(): readonly MenuGroup[] { return menuOf(this.value); }
  access(pick: ModelPick): Access | null { return accessOf(this.value, pick); }

  setInlineHtml(on: boolean): void { this.write({ ...this.value, inlineHtml: on }); }
  setKey(id: CloudId, key: string): void { this.write({ ...this.value, keys: { ...this.value.keys, [id]: key } }); }
  setListed(id: CloudId, models: readonly string[]): void { this.write({ ...this.value, listed: { ...this.value.listed, [id]: models } }); }
  addModel(id: CloudId, model: string): void {
    const m = model.trim(); if (!m || this.value.added[id].includes(m)) return;
    this.write(toggleShown({ ...this.value, added: { ...this.value.added, [id]: [...this.value.added[id], m] } }, { provider: id, model: m }));
  }
  toggle(pick: ModelPick): void { this.write(toggleShown(this.value, pick)); }
  choose(pick: ModelPick): void { this.write({ ...this.value, last: pick }); }

  addEndpoint(name: string, baseUrl: string): EndpointId {
    const id = newEndpointId();
    this.write({ ...this.value, endpoints: [...this.value.endpoints, { id, name: name.trim() || 'Local', baseUrl: baseUrl.trim(), models: [] }] });
    return id;
  }
  editEndpoint(id: EndpointId, p: Partial<Omit<Endpoint, 'id'>>): void {
    this.write({ ...this.value, endpoints: this.value.endpoints.map((e) => (e.id === id ? { ...e, ...p } : e)) });
  }
  removeEndpoint(id: EndpointId): void {
    const s = this.value;
    this.write({ ...s, endpoints: s.endpoints.filter((e) => e.id !== id), shown: s.shown.filter((p) => !(p.provider === 'local' && p.model.startsWith(`${id}/`))) });
  }

  private write(next: AiSettings): void {
    this.value = next;
    if (!readerWritesAllowed()) return;
    try { localStorage.setItem(AI_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  }
}
export const ai = new Ai();

/* Settings, opened at one provider's card: its key field, or the card's first
   field where it takes no key, is scrolled to and focused once the panel has
   drawn it. */
const FRAMES = 20;
export const openSettingsAt = (provider: ProviderId): void => {
  ui.openSettings();
  const seek = (left: number): void => {
    const card = document.querySelector<HTMLElement>(`[data-ai-card="${provider}"]`);
    if (!card) { if (left > 0) requestAnimationFrame(() => seek(left - 1)); return; }
    const input = card.querySelector<HTMLInputElement>('input[type="password"]') ?? card.querySelector<HTMLInputElement>('input');
    (input ?? card).scrollIntoView({ block: 'center' });
    input?.focus({ preventScroll: true });
  };
  seek(FRAMES);
};
