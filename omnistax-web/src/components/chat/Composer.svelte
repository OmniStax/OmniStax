<script lang="ts">
  import AtPicker from '../ui/AtPicker.svelte';
  import { chipOf, pickerRoot } from '../../lib/picker/sources';
  import { withChip, withoutChip, type Chip } from '../../lib/chat/context';
  import type { PickerRow } from '../../lib/picker/model';

  let { chips, onchips, onsend, onstop, streaming, widgets, onwidgets, offer, onoffer, ready }: {
    chips: readonly Chip[];
    onchips: (c: readonly Chip[]) => void;
    onsend: (text: string) => void;
    onstop: () => void;
    streaming: boolean;
    widgets: boolean;
    onwidgets: () => void;
    offer: Chip | null;
    onoffer: () => void;
    ready: boolean;
  } = $props();

  let text = $state('');
  let field = $state<HTMLTextAreaElement | null>(null);
  let picker = $state<{ handleKey(e: KeyboardEvent): boolean } | null>(null);
  let at = $state<number | null>(null);
  let query = $state('');
  const root = pickerRoot();

  export function focus(): void { field?.focus(); }
  export function insert(words: string): void {
    const cut = field?.selectionStart ?? text.length;
    text = `${text.slice(0, cut)}${text.slice(0, cut) && !/\s$/.test(text.slice(0, cut)) ? '\n\n' : ''}${words}${text.slice(cut) ? '\n\n' : ''}${text.slice(cut)}`;
    focus();
  }

  const AT = /(?:^|\s)@([^\s@]*)$/;
  const read = (): void => {
    const cut = field?.selectionStart ?? text.length;
    const m = AT.exec(text.slice(0, cut));
    if (!m) { close(); return; }
    at = cut - m[1].length - 1;
    query = m[1];
  };

  const close = (): void => { at = null; query = ''; };

  const choose = (row: PickerRow): void => {
    const start = at; if (start === null) return;
    const cut = field?.selectionStart ?? text.length;
    text = text.slice(0, start) + text.slice(cut);
    onchips(withChip(chips, chipOf(row)));
    close();
    focus();
  };

  const send = (): void => {
    const words = text.trim(); if (words === '') return;
    text = '';
    close();
    onsend(words);
  };

  const onkeydown = (e: KeyboardEvent): void => {
    /* Nothing typed in the composer is a chord of the shell's. */
    e.stopPropagation();
    if (at !== null && picker?.handleKey(e)) { e.preventDefault(); return; }
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!streaming) send(); }
  };
</script>

<div class="composer">
  {#if offer}
    <div class="offer">
      <span>Now reading {offer.label}</span>
      <button type="button" class="btn ghost sm" onclick={onoffer}>Add</button>
    </div>
  {/if}

  {#if chips.length}
    <ul class="chips" aria-label="What the model is shown">
      {#each chips as c (c.kind + c.key)}
        <li title={c.text.slice(0, 400)}>
          <span class="chip-label">{c.label}</span>
          <button type="button" aria-label="Remove {c.label}" title="Remove {c.label}" onclick={() => onchips(withoutChip(chips, c))}>×</button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="field">
    {#if at !== null}
      <AtPicker bind:this={picker} {root} {query} onchoose={choose} onclose={close} />
    {/if}
    <textarea bind:this={field} bind:value={text} {onkeydown} oninput={read} onclick={read}
      placeholder={ready ? 'Ask anything · @ to add context' : 'Add a provider key in Settings → AI'}
      aria-label="Message" rows="2"></textarea>
    <div class="acts">
      <button type="button" class="toggle" class:on={widgets} aria-pressed={widgets} onclick={onwidgets}
        title="Let answers include a small interactive page">Widgets</button>
      <span class="spacer"></span>
      {#if streaming}
        <button type="button" class="btn sm" onclick={onstop}>Stop</button>
      {:else}
        <button type="button" class="btn primary sm" disabled={text.trim() === ''} onclick={send}>Send <kbd>↵</kbd></button>
      {/if}
    </div>
  </div>
</div>

<style>
  .composer{flex:none;border-top:1px solid var(--rule);padding:8px 40px 12px;background:var(--bg);font-family:var(--sans)}
  .field{position:relative;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--rule);transition:box-shadow 120ms}
  .field:focus-within{box-shadow:inset 0 0 0 1px var(--accent),0 0 0 3px color-mix(in srgb,var(--accent) 14%,transparent)}
  textarea{display:block;width:100%;font:inherit;font-size:0.92rem;line-height:1.5;padding:11px 14px 4px;border:0;background:transparent;color:var(--ink);resize:none;max-height:40vh}
  textarea::placeholder{color:var(--muted);opacity:0.8}
  textarea:focus{outline:none}
  .acts{display:flex;align-items:center;gap:8px;padding:4px 8px 8px}
  .spacer{flex:1}
  kbd{font:inherit;font-weight:500;opacity:0.6}
  .chips{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 6px;padding:0;list-style:none}
  .chips li{display:inline-flex;align-items:center;gap:2px;height:24px;font-size:0.76rem;font-weight:600;color:var(--ink);background:var(--soft);border-radius:999px;padding:0 4px 0 10px;max-width:22rem}
  .chip-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chips button{font:inherit;line-height:1;width:18px;height:18px;border:0;border-radius:50%;background:transparent;color:var(--muted);cursor:pointer;padding:0}
  .chips button:hover{color:var(--ink);background:var(--soft2)}
  .offer{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:0.78rem;color:var(--muted)}
  @media (max-width:900px){ .composer{padding:8px 18px 12px} }
</style>
