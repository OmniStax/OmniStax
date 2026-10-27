<script lang="ts">
  /* Where the reader has mentioned a section, at its foot beside "Practice this
     section": the notes, chat messages, drawings and annotations that link to it
     or to anything it holds. The static page carries none of it, since it is the
     reader's own; the shell mounts this into the section's end, and a section
     nobody has mentioned shows nothing at all rather than a control that opens
     onto an empty list. A click on the control lays the mentions out as bubbles,
     each saying where it is from and quoting the words around the mention, and
     a bubble opens that place: the note at the link, the chat at the message,
     the drawing, the highlight. */
  import { mentions } from '../../lib/notes/mentions.svelte';
  import { originKey, type Mention } from '../../lib/notes/mentions';
  import { notes } from '../../lib/notes/store.svelte';
  import { goNote } from '../../lib/notes/go';
  import { showChatAt } from '../../lib/chat/open.svelte';
  import { messageId } from '../../lib/chat/model';
  import { jump, onMiddle, openingOf, openItem } from '../../lib/sections/nav.svelte';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { ICON } from '../../lib/icons';
  import { chatId, drawingId, drawingItem, itemKey, noteId, noteItem, sectionRef, type BookId, type SectionId } from '../../lib/types/ids';

  let { book, section }: { book: BookId; section: SectionId } = $props();

  let open = $state(false);
  let host = $state<HTMLElement | null>(null);
  const list = $derived(mentions.of(sectionRef(book, section)));
  $effect(() => { mentions.load(); });

  const ICONS: Readonly<Record<Mention['origin']['kind'], string>> = { note: ICON.note, chat: ICON.chat, drawing: ICON.drawing, annotation: ICON.highlighter };
  const QUOTE = 48;
  const cut = (s: string): string => { const flat = s.replace(/\s+/g, ' ').trim(); return flat.length > QUOTE ? `${flat.slice(0, QUOTE - 1)}…` : flat; };
  const whereOf = (m: Mention): string => {
    const o = m.origin;
    if (o.kind === 'chat') return `${o.name || i18n.t('views.search.chat')} · ${o.role === 'user' ? i18n.t('views.search.you') : i18n.t('views.search.ai')}`;
    if (o.kind === 'annotation') return `“${cut(o.quote)}” · ${o.section}`;
    return o.name;
  };

  /* The group this copy of the section is read in, which is where a tab opens. */
  const groupHere = (): number => { const g = host?.closest<HTMLElement>('.pane')?.dataset.group; return g === undefined ? layoutStore.layout.focus : +g; };
  /* A note lands on its link once the tab has drawn it; a note being written shows no links, and is only opened. */
  const land = (note: string, marks: readonly string[], tries = 6): void => {
    const sel = marks.flatMap((k) => [`[data-link="${CSS.escape(k)}"]`, `[data-embed="${CSS.escape(k)}"]`]).join(',');
    const tab = document.querySelector<HTMLElement>(`.pane:not([hidden]) .note-tab[data-note="${CSS.escape(note)}"]`);
    const at = sel && tab ? tab.querySelector<HTMLElement>(sel) : null;
    if (at) { jump(at, 'center'); return; }
    if (tries > 0) setTimeout(() => land(note, marks, tries - 1), 120);
  };
  const go = (m: Mention, e: MouseEvent): void => {
    const o = m.origin, how = openingOf(e), group = how === 'new' ? 'new' : groupHere();
    if (o.kind === 'note') void openItem(itemKey(noteItem(noteId(o.note))), group, how).then(() => land(o.note, m.marks ?? []));
    else if (o.kind === 'chat') void showChatAt(chatId(o.chat), messageId(o.message));
    else if (o.kind === 'drawing') void openItem(itemKey(drawingItem(drawingId(o.drawing))), group, how);
    else { const n = notes.get(o.highlight); if (n) goNote(n); }
  };
</script>

{#if list.length}
  <button type="button" class="mentioned" bind:this={host} aria-expanded={open} aria-label={i18n.t('notes.mentions.count', { count: list.length })}
    onclick={() => (open = !open)}>{i18n.t('notes.mentions.button')}<span class="n">{list.length}</span></button>
  {#if open}
    <ul class="mentions" aria-label={i18n.t('notes.mentions.list')}>
      {#each list as m (originKey(m.origin))}
        <li>
          <button type="button" class="bubble k-{m.origin.kind}" class:mine={m.origin.kind !== 'chat' || m.origin.role === 'user'}
            onclick={(e) => go(m, e)} onauxclick={onMiddle((e) => go(m, e))}>
            <span class="where">{@html ICONS[m.origin.kind]}<span class="name">{whereOf(m)}</span>{#if m.attached}<span class="tag">{i18n.t('notes.mentions.attached')}</span>{/if}</span>
            {#if m.excerpt}<span class="words">{m.excerpt}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  .mentioned{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:0.8rem;font-weight:600;padding:5px 12px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);color:var(--ink);cursor:pointer}
  .mentioned:hover{background:var(--soft)}
  .mentioned:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .mentioned[aria-expanded="true"]{background:var(--soft)}
  .n{font-weight:600;font-size:0.72rem;min-width:18px;padding:0 5px;border-radius:9px;background:var(--soft2, var(--soft));color:var(--muted);text-align:center}
  .mentions{flex-basis:100%;list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;max-width:42rem}
  .bubble{display:flex;flex-direction:column;gap:4px;width:100%;text-align:left;font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:14px 14px 14px 4px;padding:9px 14px;cursor:pointer}
  .bubble.mine{border-radius:14px 14px 4px 14px;background:var(--soft)}
  .bubble:hover{border-color:var(--accent)}
  .bubble:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .where{display:flex;align-items:center;gap:6px;min-width:0;font-size:0.72rem;color:var(--muted)}
  .where :global(svg){flex:none;width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tag{flex:none;font-size:0.66rem;padding:0 6px;border:1px solid var(--rule);border-radius:8px}
  .words{font-family:var(--serif);font-size:0.9rem;line-height:1.5}
</style>
