<script lang="ts">
  /* The editor of a code card: CodeMirror, as the note editor is, with line
     numbers and the mono font, dressed in the app's tokens and with no syntax
     colouring. The language pack loads when the editor mounts, so a page with
     no code card never fetches it. Keys stay inside the editor except the
     shell's own chords; Tab indents, and Ctrl+Enter runs. */
  import { EditorView, keymap, drawSelection, lineNumbers, highlightActiveLine } from '@codemirror/view';
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
  import { indentUnit } from '@codemirror/language';
  import type { Extension } from '@codemirror/state';
  import type { Lang } from '../../lib/code/types';

  let { value, lang, label, onchange, onfocus, onrun }: {
    value: string; lang: Lang; label: string;
    onchange: (v: string) => void; onfocus?: () => void; onrun?: () => void;
  } = $props();

  let view: EditorView | null = null;
  let emitted = '';

  const PACKS: Readonly<Record<Lang, () => Promise<Extension>>> = {
    python: () => import('@codemirror/lang-python').then((m) => m.python()),
    javascript: () => Promise.resolve([]),
  };

  const SHELL_KEYS = ['k', 'p', ','];
  const isShell = (e: KeyboardEvent): boolean => e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && SHELL_KEYS.includes(e.key.toLowerCase()));

  const theme = EditorView.theme({
    '&': { color: 'var(--ink)', backgroundColor: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: '0.84rem', border: '1px solid var(--rule)', borderRadius: '6px' },
    '&.cm-focused': { outline: '2px solid var(--accent)', outlineOffset: '-1px' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.55', minHeight: '8em', maxHeight: '28em', overflow: 'auto' },
    '.cm-content': { padding: '8px 0', caretColor: 'var(--accent)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--soft2)' },
    '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--muted)', border: 'none', borderRight: '1px solid var(--rule)' },
    '.cm-activeLine': { backgroundColor: 'var(--soft)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--ink)' },
  });

  const extensions = (pack: Extension): readonly Extension[] => [
    EditorView.domEventHandlers({
      keydown: (e) => { if (!isShell(e)) e.stopPropagation(); return false; },
      focus: () => { onfocus?.(); return false; },
    }),
    keymap.of([{ key: 'Mod-Enter', run: () => { onrun?.(); return true; } }, indentWithTab, ...defaultKeymap, ...historyKeymap]),
    history(),
    drawSelection(),
    lineNumbers(),
    highlightActiveLine(),
    indentUnit.of('    '),
    pack,
    theme,
    EditorView.contentAttributes.of({ 'aria-label': label }),
    EditorView.updateListener.of((u) => {
      if (!u.docChanged) return;
      emitted = u.state.doc.toString();
      onchange(emitted);
    }),
  ];

  const mount = (node: HTMLElement) => {
    let gone = false;
    emitted = value;
    void PACKS[lang]().catch(() => []).then((pack) => {
      if (gone) return;
      view = new EditorView({ doc: value, parent: node, extensions: [...extensions(pack)] });
    });
    return { destroy() { gone = true; view?.destroy(); view = null; } };
  };

  /* A language switched or a draft put back replaces the text; the editor's own edits are let be. */
  $effect(() => {
    const next = value;
    if (!view || next === emitted) return;
    emitted = next;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
  });
</script>

{#key lang}<div class="code-editor" use:mount></div>{/key}

<style>
  .code-editor{margin-top:10px;min-height:8em}
</style>
