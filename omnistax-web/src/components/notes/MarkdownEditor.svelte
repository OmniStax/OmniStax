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
  import { autocompletion, completionStatus, startCompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
  import type { Extension } from '@codemirror/state';
  import type { Candidate } from '../../lib/notes/md/complete';

  let { value, onchange, complete, onimage }: {
    value: string;
    onchange: (v: string) => void;
    complete: () => readonly Candidate[];
    onimage: (file: File) => Promise<string>;
  } = $props();

  let view: EditorView | null = null;
  /* The last text this editor sent out; what comes back as `value` is then its
     own edit and must not be written over the cursor. */
  let emitted = '';

  export function focus(): void { view?.focus(); }

  /* ── the wiki-link completion ──────────────────────────────────────────── */

  /* Open brackets with nothing but the link's own text after them: the reader
     is inside a link, and only there does the list appear. */
  const OPEN = /\[\[([^\]\n]*)$/;

  /* A row that writes a card rather than a link changes the brackets it was
     opened inside: the completion reaches back over the `[[` and writes `![[`,
     unless the reader had already typed the mark themselves. */
  const apply = (c: Candidate) => (v: EditorView, _c: Completion, from: number, to: number): void => {
    const closed = v.state.doc.sliceString(to, to + 2) === ']]';
    const mark = c.embed === true && v.state.doc.sliceString(Math.max(0, from - 3), from - 2) !== '!';
    const start = mark ? from - 2 : from;
    const insert = (mark ? '![[' : '') + c.insert + (closed ? '' : ']]');
    v.dispatch({
      changes: { from: start, to, insert },
      selection: { anchor: start + insert.length + (closed ? 2 : 0) },   /* past the closing brackets, either way */
      userEvent: 'input.complete',
    });
  };

  const source = (ctx: CompletionContext): CompletionResult | null => {
    const line = ctx.state.doc.lineAt(ctx.pos);
    const open = OPEN.exec(line.text.slice(0, ctx.pos - line.from));
    if (!open) return null;
    return {
      from: ctx.pos - open[1].length,
      options: complete().map((c) => ({ label: c.label, detail: c.detail, apply: apply(c) })),
      validFor: /^[^\]\n]*$/,
    };
  };

  /* ── typing the second bracket ─────────────────────────────────────────── */

  const brackets = EditorView.inputHandler.of((v, from, to, text) => {
    if (text !== '[' || from !== to) return false;
    const before = v.state.doc.sliceString(Math.max(0, from - 2), from);
    if (!before.endsWith('[') || before === '[[') return false;
    v.dispatch({ changes: { from, to, insert: '[]]' }, selection: { anchor: from + 1 }, userEvent: 'input.type' });
    /* after the dispatch has settled, so the source sees the brackets */
    queueMicrotask(() => startCompletion(v));
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
    keydown: (e, v) => { if (!isExit(e) || (e.key === 'Escape' && completionStatus(v.state) !== null)) e.stopPropagation(); return false; },
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
    history(),
    drawSelection(),
    EditorView.lineWrapping,
    markdown(),
    syntaxHighlighting(highlight, { fallback: true }),
    /* before the plain keymap, so Enter and the arrows belong to the list while it is open */
    autocompletion({ override: [source], icons: false, closeOnBlur: true }),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    brackets,
    handlers,
    theme,
    EditorView.updateListener.of((u) => {
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

<div class="md-editor" use:mount></div>

<style>
  .md-editor { height: 100%; overflow: hidden; background: var(--bg); }
</style>
