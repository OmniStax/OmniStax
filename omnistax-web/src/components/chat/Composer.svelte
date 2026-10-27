<script lang="ts">
  import AtPicker from '../ui/AtPicker.svelte';
  import ModelMenu from './ModelMenu.svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { chipOf, chipForItem, pickerRoot } from '../../lib/picker/sources';
  import { dragging as layoutDrag } from '../../lib/layout/drag.svelte';
  import { chipOfRow } from '../../lib/chat/library';
  import { chipOfLink, linkOfDrop } from '../../lib/chat/drop';
  import { chip, sameChip, withChip, withoutChip, type Chip } from '../../lib/chat/context';
  import { chats } from '../../lib/chat/store.svelte';
  import { ai } from '../../lib/chat/settings.svelte';
  import { assetEmbed, assetOfEmbed, snapshotImage } from '../../lib/drawer/snapshot';
  import { getAsset } from '../../lib/notes/assets';
  import type { PickerRow } from '../../lib/picker/model';
  import type { ChatId } from '../../lib/types/ids';

  let { chatId, chips, onchips, onsend, onstop, streaming, blocked }: {
    chatId: ChatId;
    chips: readonly Chip[];
    onchips: (c: readonly Chip[]) => void;
    onsend: (text: string) => void;
    onstop: () => void;
    streaming: boolean;
    blocked?: string;
  } = $props();

  let text = $state('');
  let field = $state<HTMLTextAreaElement | null>(null);
  let picker = $state<{ handleKey(e: KeyboardEvent): boolean; complete(): void } | null>(null);
  let at = $state<number | null>(null);
  let query = $state('');
  let dragging = $state(false);
  /* A chat is handed figures, concepts and exercises; the rest of the tree is the note editor's. */
  const root = pickerRoot({ kinds: ['figures', 'concepts', 'exercises', 'annotations'] });

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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!streaming && !blocked && ready) send(); }
  };

  /* ── images ────────────────────────────────────────────────────────────── */

  const takeImages = (files: readonly File[]): void => {
    for (const file of files.filter((f) => f.type.startsWith('image/'))) {
      void snapshotImage(file).then((shot) => {
        if (!shot) return;
        const ref = assetEmbed(shot.asset);
        add(chip('image', ref, file.name && file.name !== 'image.png' ? file.name : i18n.t('chat.composer.image'), '', false, ref));
      });
    }
  };
  const onpaste = (e: ClipboardEvent): void => {
    const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    takeImages(files);
  };
  /* Images from the desktop become pictures; a tab dragged from the explorer (a
     section's text, a note, a drawing, a file, a chat) becomes a reference; and
     anything dragged out as the words that embed it (a concept off the map or a
     panel, an equation, a figure's head, a highlight, a bubble) becomes the chip
     the picker would make for it. Only words no chip can stand for are typed
     in, where the field is. The chat tab hands on what is dropped on its
     transcript, so the whole of the chat takes a drop. */
  const carries = (e: DragEvent): boolean => {
    const types = e.dataTransfer?.types ?? [];
    return !!layoutDrag() || types.includes('Files') || types.includes('text/plain');
  };
  export function over(e: DragEvent, wide = false): void {
    if (wide && layoutDrag()) return;
    if (!carries(e)) return;
    e.preventDefault(); e.stopPropagation(); dragging = true;
    if (e.dataTransfer) e.dataTransfer.dropEffect = layoutDrag() ? 'move' : 'copy';
  }
  export function leave(e: DragEvent): void {
    const into = e.relatedTarget as Node | null;
    if (!(e.currentTarget as HTMLElement).contains(into)) dragging = false;
  }
  export function drop(e: DragEvent, wide = false): void {
    if (wide && layoutDrag()) return;
    dragging = false;
    const d = layoutDrag();
    if (d) { e.preventDefault(); e.stopPropagation(); const c = chipForItem(d.key); if (c) add(c); return; }
    const files = [...(e.dataTransfer?.files ?? [])];
    if (files.some((f) => f.type.startsWith('image/'))) { e.preventDefault(); e.stopPropagation(); takeImages(files); return; }
    const words = e.dataTransfer?.getData('text/plain') ?? '';
    const link = linkOfDrop(words);
    /* plain words let go on the field are the field's own to place, where the pointer is */
    if (words.trim() === '' || (!link && e.target === field)) return;
    /* a bubble of this chat let go over its own transcript was not meant for it */
    if (wide && link?.kind === 'chat' && link.chat === chatId) return;
    e.preventDefault(); e.stopPropagation();
    if (!link) { insert(words); return; }
    void chipOfLink(link).then((c) => { if (c) add(c); else insert(words); }, () => insert(words));
  }

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

  {#if chips.length}
    <ul class="chips" aria-label={i18n.t('chat.composer.chips')}>
      {#each chips as c (c.kind + c.key)}
        <li title={c.text.slice(0, 400)} class:pic={!!c.image}>
          {#if c.image && thumbs[c.image]}<img class="thumb" src={thumbs[c.image]} alt="" />{/if}
          <span class="chip-label">{c.label}</span>
          <button type="button" aria-label={i18n.t('chat.composer.remove', { label: c.label })} onclick={() => onchips(withoutChip(chips, c))}>×</button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="field" class:dragging role="presentation" ondragover={over} ondragleave={leave} ondrop={drop}>
    {#if at !== null}
      <AtPicker bind:this={picker} {root} {query} {field} previews onchoose={choose} onclose={close} />
    {/if}
    <textarea bind:this={field} bind:value={text} {onkeydown} {onpaste} oninput={read} onclick={read} onfocus={read}
      placeholder={ready ? i18n.t('chat.composer.placeholder') : i18n.t('chat.composer.noModel')}
      aria-label={i18n.t('chat.composer.message')} rows="2"></textarea>
    <div class="acts">
      <span class="spacer"></span>
      <ModelMenu {chatId} />
      {#if streaming}
        <button type="button" class="btn sm" onclick={onstop}>{i18n.t('chat.composer.stop')}</button>
      {:else}
        <button type="button" class="btn primary sm" disabled={text.trim() === '' || !!blocked || !ready} title={blocked ?? (ready ? '' : i18n.t('chat.composer.configure'))} onclick={send}>{i18n.t('chat.bubble.send')} <kbd>↵</kbd></button>
      {/if}
    </div>
  </div>
</div>

<style>
  .composer{flex:none;border-top:1px solid var(--rule);padding:6px 40px 6px;background:var(--bg);font-family:var(--sans)}
  .field{position:relative;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--rule);transition:box-shadow 120ms}
  .field:focus-within,.field.dragging{box-shadow:inset 0 0 0 1px var(--accent),0 0 0 3px color-mix(in srgb,var(--accent) 14%,transparent)}
  textarea{display:block;width:100%;font:inherit;font-size:0.92rem;line-height:1.5;padding:9px 14px 2px;border:0;background:transparent;color:var(--ink);resize:none;max-height:40vh}
  textarea::placeholder{color:var(--muted);opacity:0.8}
  textarea:focus{outline:none}
  .acts{display:flex;align-items:center;gap:6px;padding:2px 8px 6px}
  .spacer{flex:1}
  kbd{font:inherit;font-weight:500;opacity:0.6}
  .chips{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 6px;padding:0;list-style:none}
  .chips li{display:inline-flex;align-items:center;gap:2px;height:24px;font-size:0.76rem;font-weight:600;color:var(--ink);background:var(--soft);border-radius:999px;padding:0 4px 0 10px;max-width:22rem}
  .chips li.pic{padding-left:3px}
  .thumb{width:18px;height:18px;border-radius:50%;object-fit:cover;margin-right:4px}
  .chip-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chips button{font:inherit;line-height:1;width:18px;height:18px;border:0;border-radius:50%;background:transparent;color:var(--muted);cursor:pointer;padding:0}
  .chips button:hover{color:var(--ink);background:var(--soft2)}
  @media (max-width:900px){ .composer{padding:6px 18px 6px} }
</style>
