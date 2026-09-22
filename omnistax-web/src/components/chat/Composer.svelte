<script lang="ts">
  /* Where the reader writes. Above the field stand the chips — everything the
     model will be shown — each of which can be taken away, and the one offered
     for the section being read, which is never added behind the reader's back.
     Typing `@` opens the picker, and what is typed after it filters the list;
     choosing a row takes the `@…` out of the field and puts a chip up instead.

     Enter sends and Shift+Enter makes a line. While an answer is arriving the
     button is Stop, which keeps the words that came. */
  import AtPicker from '../ui/AtPicker.svelte';
  import { allRows, chipOf } from '../../lib/picker/sources';
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
  /* Where the `@` stands in the field while the picker is open, and what has
     been typed after it. */
  let at = $state<number | null>(null);
  let query = $state('');
  const rows = $derived(at === null ? [] : allRows());

  export function focus(): void { field?.focus(); }
  /* What the highlight bar pastes in: the selection goes where the cursor is,
     and the composer takes the focus so the reader can say what they want. */
  export function insert(words: string): void {
    const cut = field?.selectionStart ?? text.length;
    text = `${text.slice(0, cut)}${text.slice(0, cut) && !/\s$/.test(text.slice(0, cut)) ? '\n\n' : ''}${words}${text.slice(cut) ? '\n\n' : ''}${text.slice(cut)}`;
    focus();
  }

  /* An `@` with no space after it, ending where the cursor is: that is the
     reader reaching for the picker, and nothing else is. */
  const AT = /(?:^|\s)@([^\s@]*)$/;
  const read = (): void => {
    const cut = field?.selectionStart ?? text.length;
    const m = AT.exec(text.slice(0, cut));
    if (!m) { at = null; query = ''; return; }
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
      <span>You have moved to {offer.label}.</span>
      <button type="button" onclick={onoffer}>Add it</button>
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
      <AtPicker bind:this={picker} {rows} {query} onchoose={choose} onclose={close} />
    {/if}
    <textarea bind:this={field} bind:value={text} {onkeydown} oninput={read} onclick={read}
      placeholder={ready ? 'Ask about what you are reading. @ adds what the model sees.' : 'Choose a provider and paste a key under Settings → AI.'}
      aria-label="Ask the model" rows="3"></textarea>
    <div class="acts">
      <button type="button" class="widget-toggle" class:on={widgets} onclick={onwidgets}
        title="Let the answer hold a small interactive page, shown in a sandbox">Widgets {widgets ? 'on' : 'off'}</button>
      <span class="spacer"></span>
      {#if streaming}
        <button type="button" class="send" onclick={onstop}>Stop</button>
      {:else}
        <button type="button" class="send" disabled={text.trim() === ''} onclick={send}>Send</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .composer{flex:none;border-top:1px solid var(--rule);padding:8px 40px 12px;background:var(--bg);font-family:var(--sans)}
  .field{position:relative}
  textarea{width:100%;font:inherit;font-size:0.95rem;line-height:1.5;padding:9px 11px;border:1px solid var(--rule);border-radius:8px;background:var(--panel);color:var(--ink);resize:vertical}
  textarea:focus{outline:none;border-color:var(--accent)}
  .acts{display:flex;align-items:center;gap:8px;margin-top:6px}
  .spacer{flex:1}
  .acts button{font:inherit;font-size:0.8rem;padding:3px 12px;border:1px solid var(--rule);border-radius:5px;background:var(--soft);color:var(--ink);cursor:pointer}
  .acts button:disabled{opacity:0.45;cursor:default}
  .widget-toggle{color:var(--muted)}
  .widget-toggle.on{color:var(--ink);border-color:var(--accent)}
  .chips{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 6px;padding:0;list-style:none}
  .chips li{display:inline-flex;align-items:center;gap:4px;font-size:0.76rem;color:var(--ink);background:var(--soft);border:1px solid var(--rule);border-radius:999px;padding:1px 4px 1px 9px;max-width:22rem}
  .chip-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chips button{font:inherit;line-height:1;border:0;background:transparent;color:var(--muted);cursor:pointer;padding:0 4px}
  .chips button:hover{color:var(--ink)}
  .offer{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:0.78rem;color:var(--muted)}
  .offer button{font:inherit;font-size:0.76rem;padding:1px 8px;border:1px solid var(--rule);border-radius:5px;background:var(--soft);color:var(--ink);cursor:pointer}
  @media (max-width:900px){ .composer{padding:8px 18px 12px} }
</style>
