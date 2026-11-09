<script lang="ts">
  /* A code card's answer: the editor, a language toggle where the exercise has
     both (opening on the book's code language where the card can run it), and Run, Submit and Give up. Run runs the visible tests and records
     nothing. Submit runs them all and then, where the answer names a bound,
     counts how the steps grow; only a pass within the bound is evidence, and a
     failed or too-slow submit leaves the card open to try again. Giving up
     before a pass is the card's own −1 (code/check.ts, evidenceOf). */
  import type { Snippet } from 'svelte';
  import { CODE_LANGS, codeFormOf, type CodeAnswerDTO, type CodeTestDTO } from '../../lib/content/schema';
  import type { Lang, Runner, TestRun } from '../../lib/code/types';
  import { errorText, evidenceOf, firstFailure, inputOf, inputText, judge, runTestOf, shown, verdictText, visibleTests, whyText, withinBound, type SubmitOutcome, type TestVerdict } from '../../lib/code/check';
  import { loadDraft, saveDraft } from '../../lib/code/drafts';
  import { growInWorker } from '../../lib/code/grow';
  import { pythonReady, pythonRunner } from '../../lib/code/python';
  import CodeEditor from './CodeEditor.svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { codeLangs } from '../../lib/settings/codelang.svelte';

  let { answer, book, section, ex, locked = false, onpass, ongiveup, tools }: {
    answer: CodeAnswerDTO; book: string; section: string; ex: string;
    locked?: boolean; onpass?: () => void; ongiveup?: () => void; tools?: Snippet;
  } = $props();

  const RUNNERS: Partial<Record<Lang, { readonly runner: Runner; readonly ready: () => boolean }>> = { python: { runner: pythonRunner, ready: pythonReady } };
  const LANG_NAMES: Readonly<Record<Lang, string>> = { python: 'Python', javascript: 'JavaScript' };
  const langs = $derived(CODE_LANGS.filter((l) => answer[l] !== undefined));
  let chosen = $state<Lang | null>(null);
  /* the book's code language, which every listing shows, where the card has it and can run it */
  const preferred = $derived(((l: string): Lang | undefined => langs.find((x) => x === l && RUNNERS[x]))(codeLangs.of(book)));
  const lang = $derived<Lang>(chosen ?? preferred ?? langs.find((l) => RUNNERS[l]) ?? langs[0] ?? 'python');
  const spec = $derived(answer[lang]);
  const starter = $derived(spec?.starter ?? '');
  const runner = $derived(RUNNERS[lang]);
  const at = $derived({ book, section, ex, lang });
  let code = $state('');
  $effect(() => { code = loadDraft(at, starter); });
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const edit = (v: string): void => {
    code = v;
    const where = at, from = starter;
    clearTimeout(saveTimer); saveTimer = setTimeout(() => saveDraft(where, v, from), 400);
  };

  type Row = { readonly test: CodeTestDTO; readonly run: TestRun; readonly verdict: TestVerdict; readonly n: number };
  let busy = $state<'running' | 'growing' | null>(null);
  let rows = $state.raw<readonly Row[]>([]);
  let hidden = $state.raw<{ readonly passed: number; readonly total: number } | null>(null);
  let outcome = $state.raw<SubmitOutcome | null>(null);
  let problem = $state<string | null>(null);
  const loading = $derived(busy !== null && !(runner?.ready() ?? true));
  const stdin = $derived(answer.tests.length > 0 && codeFormOf(answer.tests[0]) === 'stdin');

  const warm = (): void => { void runner?.runner.load().catch(() => undefined); };
  const rowsOf = (tests: readonly CodeTestDTO[], results: readonly TestRun[]): readonly Row[] =>
    tests.map((test, i) => ({ test, run: results[i] ?? { skipped: true }, verdict: judge(answer, test, results[i] ?? { skipped: true }), n: answer.tests.indexOf(test) + 1 }));
  const clear = (): void => { rows = []; hidden = null; outcome = null; problem = null; };

  const run = async (): Promise<void> => {
    if (!runner || !spec || busy) return;
    clear(); busy = 'running';
    try {
      const shownTests = visibleTests(answer);
      const r = await runner.runner.run(code, spec, shownTests.map(runTestOf));
      if (!r.ok) problem = r.killed ? i18n.t('exercises.code.killed') : errorText(r.error);
      else rows = rowsOf(shownTests, r.results);
    } catch { problem = i18n.t('exercises.code.loadFailed'); } finally { busy = null; }
  };

  const growth = async (): Promise<SubmitOutcome> => {
    const bound = answer.bound, src = answer.grow;
    if (!runner || !spec || bound === undefined || src === undefined) return { kind: 'pass' };
    busy = 'growing';
    const r = await runner.runner.count(code, spec, async (n) => inputOf(await growInWorker(src, n), stdin));
    if (!r.ok) return { kind: 'grewBroken', n: r.n, ...(r.error ? { error: r.error } : {}), ...(r.killed ? { killed: true } : {}) };
    return withinBound(r.growth, bound) ? { kind: 'pass', growth: r.growth, charged: r.charged } : { kind: 'slow', growth: r.growth, bound, charged: r.charged };
  };

  const submit = async (): Promise<void> => {
    if (!runner || !spec || busy || locked) return;
    clear(); busy = 'running';
    try {
      const r = await runner.runner.run(code, spec, answer.tests.map(runTestOf));
      let o: SubmitOutcome;
      if (!r.ok) o = { kind: 'broken', ...(r.error ? { error: r.error } : {}), ...(r.killed ? { killed: true } : {}) };
      else {
        const all = rowsOf(answer.tests, r.results);
        rows = all.filter((x) => x.test.visible);
        const secret = all.filter((x) => !x.test.visible);
        hidden = { passed: secret.filter((x) => x.verdict.ok).length, total: secret.length };
        o = firstFailure(answer, answer.tests, r.results) ?? await growth();
      }
      outcome = o;
      if (evidenceOf({ kind: 'submit', outcome: o }) === true) onpass?.();
    } catch (e) {
      problem = e instanceof Error && e.message.startsWith('grow') ? e.message : i18n.t('exercises.code.loadFailed');
    } finally { busy = null; }
  };

  const giveUp = (): void => { if (!locked) ongiveup?.(); };
  /* the failing test the reader is shown: the first, hidden or not */
  const failing = $derived(outcome?.kind === 'fail' ? outcome : null);
</script>

{#snippet detail(test: CodeTestDTO, r: TestRun, why: string)}
  <dl class="detail">
    <dt>{i18n.t('exercises.code.input')}</dt><dd><code>{inputText(test, spec?.entry)}</code></dd>
    <dt>{i18n.t('exercises.code.expected')}</dt><dd><code>{test.raises ? i18n.t('exercises.code.raises', { type: test.raises }) : test.stdin !== undefined ? test.stdout : shown(test.expect)}</code></dd>
    {#if !r.skipped && r.value !== undefined}<dt>{i18n.t('exercises.code.got')}</dt><dd><code>{shown(r.value)}</code></dd>{/if}
    {#if !r.skipped && r.stdout}<dt>{i18n.t('exercises.code.printed')}</dt><dd><pre>{r.stdout}</pre></dd>{/if}
  </dl>
  <p class="why">{why}</p>
{/snippet}

<div class="code-answer">
  {#if langs.length > 1}
    <div class="langs" role="radiogroup" aria-label={i18n.t('exercises.code.language')}>
      {#each langs as l (l)}<button type="button" role="radio" aria-checked={l === lang} class:on={l === lang} onclick={() => { chosen = l; clear(); }}>{LANG_NAMES[l]}</button>{/each}
    </div>
  {/if}
  {#if runner}
    <CodeEditor value={code} {lang} label={i18n.t('exercises.code.editor')} onchange={edit} onfocus={warm} onrun={run} />
  {:else}
    <p class="note">{i18n.t('exercises.code.noRunner', { lang: LANG_NAMES[lang] })}</p>
  {/if}

  <div class="actions">
    {@render tools?.()}
    <span class="buttons">
      {#if !locked}<button type="button" class="btn ghost" onclick={giveUp}>{i18n.t('exercises.code.giveUp')}</button>{/if}
      <button type="button" class="btn" disabled={!runner || busy !== null} onclick={run}>{i18n.t('exercises.code.run')}</button>
      {#if !locked}<button type="button" class="btn primary" disabled={!runner || busy !== null} onclick={submit}>{i18n.t('exercises.code.submit')}</button>{/if}
    </span>
  </div>

  <div class="results" role="status">
    {#if busy}<p class="note">{loading ? i18n.t('exercises.code.loading') : busy === 'growing' ? i18n.t('exercises.code.growing') : i18n.t('exercises.code.running')}</p>{/if}
    {#if problem}<p class="bad">{problem}</p>{/if}
    {#if rows.length}
      <ol class="tests">
        {#each rows as row (row.n)}
          <li class:ok={row.verdict.ok}>
            <span class="mark" aria-hidden="true">{row.verdict.ok ? '✓' : '✗'}</span>
            <span class="name">{i18n.t('exercises.code.test', { n: row.n })}</span>
            <code class="call">{inputText(row.test, spec?.entry)}</code>
            {#if !row.verdict.ok && !failing}{@render detail(row.test, row.run, whyText(row.test, row.run, row.verdict.why))}{/if}
          </li>
        {/each}
      </ol>
    {/if}
    {#if hidden && hidden.total > 0}<p class="note">{i18n.t('exercises.code.hiddenPassed', { passed: hidden.passed, total: hidden.total })}</p>{/if}
    {#if outcome}
      <p class="verdict" class:ok={outcome.kind === 'pass'} class:bad={outcome.kind !== 'pass'}>{verdictText(outcome)}</p>
      {#if failing}{@render detail(failing.test, failing.run, whyText(failing.test, failing.run, failing.why))}{/if}
    {/if}
  </div>
</div>

<style>
  .code-answer{font-family:var(--sans);font-size:0.84rem}
  .langs{display:inline-flex;gap:0;margin-top:10px;border:1px solid var(--rule);border-radius:6px;overflow:hidden}
  .langs button{border:0;background:transparent;color:var(--muted);font:inherit;padding:3px 12px;cursor:pointer}
  .langs button.on{background:var(--soft);color:var(--ink);font-weight:600}
  .langs button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .actions{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-top:12px}
  .buttons{display:inline-flex;flex-wrap:wrap;gap:8px;margin-left:auto}
  .results{margin-top:8px}
  .tests{list-style:none;margin:8px 0 0;padding:0}
  .tests li{display:grid;grid-template-columns:1.2em auto 1fr;gap:2px 8px;align-items:baseline;padding:3px 0}
  .tests .mark{color:var(--bad)} .tests li.ok .mark{color:var(--ok)}
  .tests .name{color:var(--muted)}
  .call,.detail code,.detail pre{font-family:var(--mono);font-size:0.8rem;overflow-wrap:anywhere;white-space:pre-wrap}
  .detail{grid-column:2 / -1;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:6px 0 0}
  .detail dt{color:var(--muted)} .detail dd{margin:0} .detail pre{margin:0;max-height:10em;overflow:auto}
  .why{grid-column:2 / -1;margin:4px 0 0}
  .verdict{margin:10px 0 0;font-weight:600}
  .ok{color:var(--ok)} .bad{color:var(--bad)}
  .tests li.ok,.tests li{color:var(--ink)}
  .note{margin:8px 0 0;color:var(--muted)}
</style>
