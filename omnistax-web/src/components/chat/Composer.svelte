<script lang="ts">
  import AtPicker from '../ui/AtPicker.svelte';
  import ModelMenu from './ModelMenu.svelte';
  import { chipOf, pickerRoot } from '../../lib/picker/sources';
  import { chipOfRow } from '../../lib/chat/library';
  import { chip, sameChip, withChip, withoutChip, type Chip } from '../../lib/chat/context';
  import { chats } from '../../lib/chat/store.svelte';
  import { ai } from '../../lib/chat/settings.svelte';
  import { assetEmbed, assetOfEmbed, snapshotImage } from '../../lib/drawer/snapshot';
  import { getAsset } from '../../lib/notes/assets';
  import type { PickerRow } from '../../lib/picker/model';
  import type { ChatId } from '../../lib/types/ids';

  let { chatId, chips, onchips, onsend, onstop, streaming, offer, onoffer, blocked }: {
    chatId: ChatId;
    chips: readonly Chip[];
    onchips: (c: readonly Chip[]) => void;
    onsend: (text: string) => void;
    onstop: () => void;
    streaming: boolean;
    blocked?: string;
    offer: Chip | null;
    onoffer: () => void;
  } = $props();

  let text = $state('');
  let field = $state<HTMLTextAreaElement | null>(null);
  let picker = $state<{ handleKey(e: KeyboardEvent): boolean; complete(): void } | null>(null);
  let at = $state<number | null>(null);
  let query = $state('');
  let dragging = $state(false);
  const root = pickerRoot();

  const ready = $derived.by(() => { const p = chats.pickOf(chatId); return p !== null && ai.access(p) !== null; });

  export function focus(): void { field?.focus(); }
  export function insert(words: string): void {
    const cut = field?.selectionStart ?? text.length;
    text = `${text.slice(0, cut)}${text.slice(0, cut) && !/\s$/.test(text.slice(0, cut)) ? '\n\n' : ''}${words}${text.slice(cut) ? '\n\n' : ''}${text.slice(cut)}`;
    focus();
  }

  /* The chips as they stand when an asynchronous one arrives: the prop, read
     at that moment rather than when the reading began. */
  const add = (c: Chip): void => onchips(withChip(chips, c));
  const replace = (c: Chip): void => { if (chips.some((x) => sameChip(x, c))) onchips(chips.map((x) => (sameChip(x, c) ? c : x))); };

  const AT = /(?:^|\s)@([^\s@]*)$/;
  const read = (): void => {
    const cut = field?.selectionStart ?? text.length;
    const m = AT.exec(text.slice(0, cut));
    if (!m) { close(); return; }
    at = cut - m[1].length - 1;
    query = m[1];
  };

  const close = (): void => { at = null; query = ''; };

  /* The picker follows the field: a press anywhere outside the composer closes it,
     a touch or a pen finishing the choice first, and the field taking the focus
     back reads the `@` the cursor stands after. */
  let box = $state<HTMLElement | null>(null);
  $effect(() => {
    if (at === null) return;
    const away = (e: PointerEvent): void => {
      if (!box || box.contains(e.target as Node)) return;
      if (e.pointerType !== 'mouse' && picker) picker.complete(); else close();
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  });

  const choose = (row: PickerRow): void => {
    const start = at; if (start === null) return;
    const cut = field?.selectionStart ?? text.length;
    text = text.slice(0, start) + text.slice(cut);
    close();
    focus();
    add(chipOf(row));
    void chipOfRow(row).then(replace);
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!streaming && !blocked) send(); }
  };

  /* ── images ────────────────────────────────────────────────────────────── */

  const takeImages = (files: readonly File[]): void => {
    for (const file of files.filter((f) => f.type.startsWith('image/'))) {
      void snapshotImage(file).then((shot) => {
        if (!shot) return;
        const ref = assetEmbed(shot.asset);
        add(chip('image', ref, file.name && file.name !== 'image.png' ? file.name : 'Image', '', false, ref));
      });
    }
  };
  const onpaste = (e: ClipboardEvent): void => {
    const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    takeImages(files);
  };
  const ondragover = (e: DragEvent): void => {
    if (![...(e.dataTransfer?.items ?? [])].some((i) => i.kind === 'file')) return;
    e.preventDefault(); dragging = true;
  };
  const ondrop = (e: DragEvent): void => {
    dragging = false;
    const files = [...(e.dataTransfer?.files ?? [])];
    if (!files.some((f) => f.type.startsWith('image/'))) return;
    e.preventDefault();
    takeImages(files);
  };

  let thumbs = $state.raw<Readonly<Record<string, string>>>({});
  const asked = new Set<string>();
  $effect(() => {
    for (const c of chips) {
      const ref = c.image; if (!ref || asked.has(ref)) continue;
      asked.add(ref);
      const id = assetOfEmbed(ref); if (!id) continue;
      void getAsset(id).then((url) => { if (url) thumbs = { ...thumbs, [ref]: url }; });
    }
  });
</script>

<div class="composer" bind:this={box}>
  {#if offer}
    <div class="offer">
      <span>Now reading {offer.label}</span>
      <button type="button" class="btn ghost sm" onclick={onoffer}>Add</button>
    </div>
  {/if}

  {#if chips.length}
    <ul class="chips" aria-label="What the model is shown">
      {#each chips as c (c.kind + c.key)}
        <li title={c.text.slice(0, 400)} class:pic={!!c.image}>
          {#if c.image && thumbs[c.image]}<img class="thumb" src={thumbs[c.image]} alt="" />{/if}
          <span class="chip-label">{c.label}</span>
          <button type="button" aria-label="Remove {c.label}" onclick={() => onchips(withoutChip(chips, c))}>×</button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="field" class:dragging role="presentation" {ondragover} ondragleave={() => (dragging = false)} {ondrop}>
    {#if at !== null}
      <AtPicker bind:this={picker} {root} {query} {field} onchoose={choose} onclose={close} />
    {/if}
    <textarea bind:this={field} bind:value={text} {onkeydown} {onpaste} oninput={read} onclick={read} onfocus={read}
      placeholder={ready ? 'Ask anything · @ to add context' : 'Choose a model with a key to ask'}
      aria-label="Message" rows="2"></textarea>
    <div class="acts">
      <span class="spacer"></span>
      <ModelMenu {chatId} />
      {#if streaming}
        <button type="button" class="btn sm" onclick={onstop}>Stop</button>
      {:else}
        <button type="button" class="btn primary sm" disabled={text.trim() === '' || !!blocked} title={blocked ?? ''} onclick={send}>Send <kbd>↵</kbd></button>
      {/if}
    </div>
  </div>
</div>

<style>
  .composer{flex:none;border-top:1px solid var(--rule);padding:8px 40px 12px;background:var(--bg);font-family:var(--sans)}
  .field{position:relative;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--rule);transition:box-shadow 120ms}
  .field:focus-within,.field.dragging{box-shadow:inset 0 0 0 1px var(--accent),0 0 0 3px color-mix(in srgb,var(--accent) 14%,transparent)}
  textarea{display:block;width:100%;font:inherit;font-size:0.92rem;line-height:1.5;padding:11px 14px 4px;border:0;background:transparent;color:var(--ink);resize:none;max-height:40vh}
  textarea::placeholder{color:var(--muted);opacity:0.8}
  textarea:focus{outline:none}
  .acts{display:flex;align-items:center;gap:6px;padding:4px 8px 8px}
  .spacer{flex:1}
  kbd{font:inherit;font-weight:500;opacity:0.6}
  .chips{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 6px;padding:0;list-style:none}
  .chips li{display:inline-flex;align-items:center;gap:2px;height:24px;font-size:0.76rem;font-weight:600;color:var(--ink);background:var(--soft);border-radius:999px;padding:0 4px 0 10px;max-width:22rem}
  .chips li.pic{padding-left:3px}
  .thumb{width:18px;height:18px;border-radius:50%;object-fit:cover;margin-right:4px}
  .chip-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chips button{font:inherit;line-height:1;width:18px;height:18px;border:0;border-radius:50%;background:transparent;color:var(--muted);cursor:pointer;padding:0}
  .chips button:hover{color:var(--ink);background:var(--soft2)}
  .offer{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:0.78rem;color:var(--muted)}
  @media (max-width:900px){ .composer{padding:8px 18px 12px} }
</style>
