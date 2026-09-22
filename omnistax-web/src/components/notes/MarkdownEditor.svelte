<script lang="ts">
  /* The writing side of a note: CodeMirror over the markdown, dressed in the
     app's own tokens so it follows the theme without a second palette. Three
     things are added to what the editor does by itself. A second `[` closes
     the pair and opens the list of everything the note can point at, so a link
     is chosen rather than typed. An image pasted or dropped is handed to the
     store and comes back as `![name](asset:<id>)` at the cursor. And keys are
     kept inside the editor, so typing a letter never runs a command of the
     shell — Ctrl+E is let through, because that is how the reader leaves. */
  import { EditorView, keymap, drawSelection } from '@codemirror/view';
  import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
  import { markdown } from '@codemirror/lang-markdown';
  import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
  import { tags } from '@lezer/highlight';
  import type { Extension } from '@codemirror/state';
  import type { Candidate } from '../../lib/notes/md/complete';
  import AtPicker from '../ui/AtPicker.svelte';
  import { allRows, warm } from '../../lib/picker/sources';
  import { embedText, linkInner } from '../../lib/notes/md/links';
  import type { PickerCategory, PickerRow } from '../../lib/picker/model';

  /* `complete` is the list the note tab gathered before the picker existed. The
     picker reads the same stores and more, so the rows come from there now and
     the prop is kept only so that the tab need not change; it is the next thing
     to go from the note tab. */
  let { value, onchange, complete, onimage }: {
    value: string;
    onchange: (v: string) => void;
    complete?: () => readonly Candidate[];
    onimage: (file: File) => Promise<string>;
  } = $props();

  let view: EditorView | null = null;
  /* The last text this editor sent out; what comes back as `value` is then its
     own edit and must not be written over the cursor. */
  let emitted = '';

  export function focus(): void { view?.focus(); }

  /* ── the wiki-link picker ─────────────────────────────────────────────── */

  /* A second `[` closes the pair and opens the picker, which is the same list a
     chat composer opens with `@`. `at` is where the link's own text begins, so
     what has been typed since is the query, and choosing a row writes the link
     over it. The picker stands where the cursor is. */
  let at = $state<number | null>(null);
  let query = $state('');
  let where = $state({ left: 0, top: 0, down: false });
  /* Gathered once, when the brackets open the list, and held until it closes:
     reading every store and every loaded section is far too much work to do
     again on every keystroke. */
  let rows = $state<readonly PickerRow[]>([]);
  let picker = $state<{ handleKey(e: KeyboardEvent): boolean } | null>(null);

  const gather = (): void => { rows = allRows(); };
  const onCategory = (category: PickerCategory | null): void => { gather(); void warm(category).then(gather); };

  const closePicker = (): void => { at = null; query = ''; rows = []; };

  /* Where the picker hangs, in the editor's own coordinates. */
  const place = (v: EditorView, pos: number): void => {
    const box = v.coordsAtPos(pos), host = v.dom.getBoundingClientRect();
    /* The list stands above the cursor, where it does not cover what is being
       written — unless the cursor is near the top of the note, where there is
       nothing above to stand in and the list would be cut off by the window;
       then it hangs below instead. */
    if (box) where = { left: box.left - host.left, top: box.bottom - host.top, down: box.top - host.top < LIST_HEIGHT };
  };

  /* as tall as the list can grow: `max-height: 16rem` in the picker's own rules */
  const LIST_HEIGHT = 256;

  /* The text between `[[` and the cursor, and nothing once the reader has left
     the brackets or closed them. */
  const readQuery = (v: EditorView): void => {
    const start = at; if (start === null) return;
    const cursor = v.state.selection.main.head;
    if (cursor < start) { closePicker(); return; }
    const typedText = v.state.doc.sliceString(start, cursor);
    if (/[\]\n]/.test(typedText)) { closePicker(); return; }
    query = typedText;
  };

  const choose = (row: PickerRow): void => {
    const v = view, start = at;
    if (!v || start === null) return;
    const cursor = v.state.selection.main.head;
    const closed = v.state.doc.sliceString(cursor, cursor + 2) === ']]';
    /* An embed reaches back over the `[[` to write the bang, unless the reader
       typed one themselves. */
    const bang = row.embed === true && v.state.doc.sliceString(Math.max(0, start - 3), start - 2) !== '!';
    const from = bang ? start - 2 : start;
    const insert = (bang ? embedText(row.target).slice(0, -2) : linkInner(row.target)) + (closed ? '' : ']]');
    v.dispatch({
      changes: { from, to: cursor, insert },
      selection: { anchor: from + insert.length + (closed ? 2 : 0) },
      userEvent: 'input.complete',
    });
    closePicker();
    v.focus();
  };

  /* ── typing the second bracket ─────────────────────────────────────────── */

  const brackets = EditorView.inputHandler.of((v, from, to, text) => {
    if (text !== '[' || from !== to) return false;
    const before = v.state.doc.sliceString(Math.max(0, from - 2), from);
    if (!before.endsWith('[') || before === '[[') return false;
    v.dispatch({ changes: { from, to, insert: '[]]' }, selection: { anchor: from + 1 }, userEvent: 'input.type' });
    /* after the dispatch has settled, so the position is the one the picker stands at */
    queueMicrotask(() => { at = from + 1; query = ''; gather(); place(v, from + 1); });
    return true;
  });

  /* ── images, pasted or dropped ─────────────────────────────────────────── */

  const imagesIn = (data: DataTransfer | null): readonly File[] =>
    data ? [...data.files].filter((f) => f.type.startsWith('image/')) : [];

  const altOf = (file: File): string => file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[[\]|]/g, ' ').trim() || 'image';

  const insertImages = async (v: EditorView, files: readonly File[], at: number): Promise<void> => {
    let pos = Math.min(at, v.state.doc.length);
    for (const file of files) {
      const id = await onimage(file);
      const text = `![${altOf(file)}](asset:${id})`;
      pos = Math.min(pos, v.state.doc.length);
      v.dispatch({ changes: { from: pos, to: pos, insert: text }, selection: { anchor: pos + text.length } });
      pos += text.length;
    }
  };

  /* A handful of chords belong to the shell wherever the reader is: the toggle
     between writing and reading, the palette, the settings, and Escape, which
     closes whatever the shell has open. Those are let through; every other key
     stops here, so typing a letter never runs a command. */
  const SHELL_KEYS = ['e', 'k', 'p', ','];
  const isExit = (e: KeyboardEvent): boolean =>
    e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && SHELL_KEYS.includes(e.key.toLowerCase()));

  const handlers = EditorView.domEventHandlers({
    /* Escape belongs to the list of links while it is open, and to the shell
       once it is not. */
    keydown: (e, v) => {
      /* The picker has the arrows, Enter and Escape while it is open; every
         other key goes on typing into the brackets. */
      if (at !== null && picker?.handleKey(e)) { e.preventDefault(); e.stopPropagation(); return true; }
      if (!isExit(e) || (e.key === 'Escape' && at !== null)) e.stopPropagation();
      return false;
    },
    paste: (e, v) => {
      const files = imagesIn(e.clipboardData);
      if (!files.length) return false;
      e.preventDefault();
      void insertImages(v, files, v.state.selection.main.from);
      return true;
    },
    drop: (e, v) => {
      const files = imagesIn(e.dataTransfer);
      if (!files.length) return false;
      e.preventDefault();
      void insertImages(v, files, v.posAtCoords({ x: e.clientX, y: e.clientY }) ?? v.state.selection.main.from);
      return true;
    },
  });

  /* ── the look ──────────────────────────────────────────────────────────── */

  /* Every colour is a token of the app, so light and dark need no second style. */
  const highlight = HighlightStyle.define([
    { tag: tags.heading, color: 'var(--ink)', fontWeight: '700' },
    { tag: tags.strong, fontWeight: '700' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
    { tag: [tags.link, tags.url], color: 'var(--accent)' },
    { tag: tags.monospace, fontFamily: 'var(--mono)', color: 'var(--warm)' },
    { tag: tags.quote, color: 'var(--muted)', fontStyle: 'italic' },
    { tag: [tags.meta, tags.processingInstruction, tags.list], color: 'var(--muted)' },
  ]);

  const theme = EditorView.theme({
    '&': { height: '100%', color: 'var(--ink)', backgroundColor: 'transparent', fontFamily: 'var(--sans)', fontSize: '0.95rem' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'var(--sans)', lineHeight: '1.7', overflow: 'auto' },
    '.cm-content': { padding: '20px 24px 45vh', caretColor: 'var(--accent)', maxWidth: '46rem' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--soft2)' },
    '.cm-gutters': { display: 'none' },
    '.cm-tooltip': { background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.22)' },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--sans)', maxHeight: '16rem', minWidth: '16rem' },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li': { display: 'block', padding: '6px 12px', color: 'var(--ink)', lineHeight: '1.3' },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': { background: 'var(--soft)', color: 'var(--ink)' },
    '.cm-completionLabel': { display: 'block', fontSize: '0.9rem' },
    '.cm-completionDetail': { display: 'block', marginTop: '1px', fontStyle: 'normal', fontSize: '0.75rem', color: 'var(--muted)' },
    '.cm-completionMatchedText': { textDecoration: 'none', fontWeight: '700', color: 'var(--accent)' },
  });

  /* ── mounting ──────────────────────────────────────────────────────────── */

  const extensions = (): readonly Extension[] => [
    /* First of all, because an extension named earlier is asked first: while
       the list of links is open, Enter chooses a row and the arrows walk it,
       and the editor's own keymap — which would make a line of Enter and move
       the cursor — must not see those keys before the list has had them. */
    handlers,
    history(),
    drawSelection(),
    EditorView.lineWrapping,
    markdown(),
    syntaxHighlighting(highlight, { fallback: true }),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    brackets,
    theme,
    EditorView.updateListener.of((u) => {
      if (at !== null && (u.docChanged || u.selectionSet)) { readQuery(u.view); if (at !== null) place(u.view, at); }
      if (!u.docChanged) return;
      emitted = u.state.doc.toString();
      onchange(emitted);
    }),
  ];

  const mount = (node: HTMLElement) => {
    emitted = value;
    view = new EditorView({ doc: value, parent: node, extensions: [...extensions()] });
    return { destroy() { view?.destroy(); view = null; } };
  };

  /* A note swapped in under the editor, or an edit made elsewhere, replaces the
     text; the editor's own edits arrive as what it just sent and are let be. */
  $effect(() => {
    const next = value;
    if (!view || next === emitted) return;
    emitted = next;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
  });
</script>

<div class="md-editor" use:mount>
  {#if at !== null}
    <div class="picker-at" class:down={where.down} style:left="{where.left}px" style:top="{where.top}px">
      <AtPicker bind:this={picker} {rows} {query} onchoose={choose} onclose={closePicker} oncategory={onCategory} />
    </div>
  {/if}
</div>

<style>
  .md-editor { position: relative; height: 100%; overflow: hidden; background: var(--bg); }
  /* the picker hangs below the cursor, in a box of its own so that its own
     rules — which put it above whatever opened it — have something to sit in */
  .picker-at { position: absolute; width: 22rem; max-width: calc(100% - 24px); height: 0; z-index: 30; }
  /* near the top of the note there is no room above the cursor, so the list
     hangs below it rather than off the top of the window */
  .picker-at.down :global(.picker) { bottom: auto; top: 6px; margin-bottom: 0; }
</style>
