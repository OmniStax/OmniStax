<script lang="ts">
  /* One file's sync changes, read as a diff: removed lines are the side being
     replaced, added lines the side arriving. A picture shows both versions;
     any other file that is not text says only how large each is.

     Where both sides changed a file, it reads as a merge editor does. A file
     whose changes did not meet says so and shows what the merge does here. One
     whose changes met is shown whole, the stretches both sides agree on plain
     and each conflict as this device's lines over the repo's, with the four
     actions above it (this device's, the repo's, both, or a comparison of the
     two) and a counter that walks from one conflict to the next. Each choice
     is the reader's own and can be taken back; the result can also be edited
     by hand. It is used only once every conflict is settled and it reads as
     the file should (JSON, and the record or chat it holds), and then it is
     what goes up to the repo and what this device takes. Keeping one side
     whole stays a click away.

     A file a pull held back says why above its diff, with the same choice the
     Sync view's queue offers. */
  import { sizeLabel } from '../../lib/files/model';
  import { hunksOf, lineDiff } from '../../lib/sync/diff';
  import { groupLabel } from '../../lib/sync/layout';
  import { isMerged, type Change } from '../../lib/sync/plan';
  import { settle } from '../../lib/sync/run';
  import { blocksOf, chosenLines, conflictCount, resolvedText, type Choice } from '../../lib/sync/conflict';
  import { session } from '../../lib/sync/session.svelte';
  import LineDiff from '../ui/LineDiff.svelte';
  import HeldWhy from './HeldWhy.svelte';
  import { takeable } from '../../lib/sync/held';
  import { glossOf, type OwnKind } from '../../lib/sync/gloss';
  import { explorer } from '../../lib/explorer/store.svelte';
  import { noteDocs } from '../../lib/notes/docs.svelte';
  import { entryId } from '../../lib/explorer/model';
  import { noteId } from '../../lib/types/ids';
  import { i18n } from '../../lib/i18n/store.svelte';

  const change = $derived(session.changes.find((c) => c.path === session.selected) ?? null);
  const held = $derived(change ? session.heldFor(change) : null);
  const kind = (path: string): 'text' | 'image' | 'binary' => (path.endsWith('.json') ? 'text' : /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(path) ? 'image' : 'binary');
  const MIME: Readonly<Record<string, string>> = { svg: 'image/svg+xml', jpg: 'image/jpeg' };

  /* The old side is the one the sync writes over: the repo for a push, this
     device for a pull. A file changed in both reads repo to device. */
  const sides = (c: Change): { readonly from: string; readonly to: string; readonly pull: boolean } =>
    (c.side === 'down' ? { from: i18n.t('views.diff.device'), to: i18n.t('views.diff.repo'), pull: true } : { from: i18n.t('views.diff.repo'), to: i18n.t('views.diff.device'), pull: false });
  const about = (c: Change): string =>
    c.side === 'up' ? i18n.t('views.diff.aboutPush') : c.side === 'down' ? i18n.t('views.diff.aboutPull') : session.merges.has(c.path) ? i18n.t('views.diff.aboutBoth') : i18n.t('views.diff.aboutWhole');

  type Versions = { readonly mine: Uint8Array | null; readonly theirs: Uint8Array | null };
  const versions = async (c: Change): Promise<Versions> => ({
    mine: c.local ? session.local.find((f) => f.path === c.path)?.bytes ?? null : null,
    theirs: c.remote ? await session.remoteBytes(c.remote) : null,
  });
  const loading = $derived(change ? versions(change) : null);

  /* A record keeps the reader's things by key — a note filed beside an exercise
     is `note:5f2y0vbb` in the practice record — so a line holding one is glossed
     with the name it goes by now, read live, so a rename shows at once. */
  const nameOf = (kind: OwnKind, id: string): string | undefined =>
    (kind === 'note' ? noteDocs.get(noteId(id))?.name : undefined) ?? explorer.entry(entryId(id))?.name;
  const gloss = (line: string): string | null => glossOf(line, nameOf);

  const MAX_LINES = 3000;
  const textOf = (b: Uint8Array | null): string[] => (b ? new TextDecoder().decode(b).replace(/\n$/, '').split('\n') : []);
  const linesOf = (s: string): string[] => (s ? s.replace(/\n$/, '').split('\n') : []);
  const diffOf = (c: Change, v: Versions) => {
    const [a, b] = sides(c).pull ? [v.mine, v.theirs] : [v.theirs, v.mine];
    const lines = lineDiff(textOf(a), textOf(b));
    return { ...hunksOf(lines), added: lines.filter((l) => l.kind === 'add').length, removed: lines.filter((l) => l.kind === 'del').length };
  };
  const url = (node: HTMLImageElement, of: { bytes: Uint8Array; path: string }) => {
    const ext = of.path.split('.').pop() ?? '';
    const u = URL.createObjectURL(new Blob([of.bytes as BlobPart], { type: MIME[ext] ?? `image/${ext}` }));
    node.src = u;
    return { destroy: () => URL.revokeObjectURL(u) };
  };

  /* ── The merge of a file changed on both sides ── */
  const merge = $derived(change?.side === 'both' ? session.merges.get(change.path) ?? null : null);
  const pick = $derived(change ? session.picks.get(change.path) : undefined);
  const blocks = $derived(merge ? blocksOf(merge.mine, merge.theirs) : []);
  const total = $derived(conflictCount(blocks));
  /* Each block's place among the conflicts, or -1 for a stretch both share. */
  const ordinal = $derived.by(() => { let n = 0; return blocks.map((b) => (b.kind === 'conflict' ? n++ : -1)); });
  const draft = $derived(change ? session.drafts.get(change.path) ?? null : null);
  const choices = $derived(Array.from({ length: total }, (_, i) => draft?.choices[i] ?? null));
  const settled = $derived(choices.filter((c) => c !== null).length);
  const editing = $derived(draft?.edited != null);
  const result = $derived(draft?.edited ?? resolvedText(blocks, choices));
  const inUse = $derived(change !== null && isMerged(pick) && !pick.auto && session.chosen(change));

  let current = $state(0);
  let els = $state<HTMLElement[]>([]);
  let comparing = $state<ReadonlySet<number>>(new Set());
  let unfolded = $state<ReadonlySet<number>>(new Set());
  let problem = $state<string | null>(null);
  $effect(() => { void session.selected; current = 0; comparing = new Set(); unfolded = new Set(); });

  const setDraft = (next: readonly (Choice | null)[], edited: string | null = null): void => { if (change) session.draft(change.path, { choices: next, edited }); };
  const choose = (i: number, c: Choice | null): void => {
    const next = [...choices]; next[i] = c; setDraft(next);
    current = i;
  };
  const goTo = (i: number): void => {
    if (!total) return;
    current = (i + total) % total;
    els[current]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  const toggle = (set: ReadonlySet<number>, i: number): ReadonlySet<number> => { const n = new Set(set); if (n.has(i)) n.delete(i); else n.add(i); return n; };

  /* The result is checked as the file it would become, as it changes. */
  $effect(() => {
    const c = change, text = result;
    problem = null;
    if (!c || text === null || !merge || total === 0) return;
    let live = true;
    void settle(c, text, false).then((r) => { if (live) problem = r.problem; });
    return () => { live = false; };
  });
  const use = async (): Promise<void> => { if (change && result !== null) problem = await session.resolve(change, result); };

  const FOLD = 8, KEEP = 3;
  const CHOSE: Readonly<Record<Choice, 'views.diff.chose.mine' | 'views.diff.chose.theirs' | 'views.diff.chose.both'>> = { mine: 'views.diff.chose.mine', theirs: 'views.diff.chose.theirs', both: 'views.diff.chose.both' };
</script>

{#snippet version(name: string, bytes: Uint8Array | null, path: string, image: boolean)}
  <figure>
    <figcaption>{name}</figcaption>
    {#if !bytes}<p class="none">{i18n.t('views.diff.notThere')}</p>
    {:else if image}<img alt={i18n.t('views.diff.version', { name })} use:url={{ bytes, path }}>
    {:else}<p class="none">{sizeLabel(bytes.length)}</p>{/if}
  </figure>
{/snippet}

{#snippet lines(of: readonly string[], cls: string)}
  {#each of as l, j (j)}<div class="ln {cls}">{l}</div>{/each}
{/snippet}

{#snippet keep(c: Change)}
  <span class="choose" role="group" aria-label={i18n.t('views.diff.keepWhich')}>
    <button type="button" aria-pressed={pick === 'mine'} disabled={session.phase !== 'ready'} onclick={() => session.pick(c.path, 'mine')}>{i18n.t('views.diff.keepMine')}</button>
    <button type="button" aria-pressed={pick === 'theirs'} disabled={session.phase !== 'ready'} onclick={() => session.pick(c.path, 'theirs')}>{i18n.t('views.diff.keepTheirs')}</button>
    {#if merge?.merged}
      <button type="button" aria-pressed={isMerged(pick)} disabled={session.phase !== 'ready'} onclick={() => session.pick(c.path, 'merged')}>{i18n.t('views.diff.useMerge')}</button>
    {/if}
  </span>
{/snippet}

<div class="diff">
  {#if !change}
    <p class="empty">{i18n.t('views.diff.empty')}</p>
  {:else}
    {@const s = sides(change)}
    <header>
      <h2>{change.label}</h2>
      <p class="path">{groupLabel(change.group, i18n.locale)} · {change.path}</p>
      {#if held}
        <div class="held"><HeldWhy h={held} /></div>
        <span class="choose" role="group" aria-label={i18n.t('views.diff.keepWhich')}>
          <button type="button" aria-pressed={held.pick === 'mine'} disabled={session.phase !== 'ready'} onclick={() => session.hold(change.path, 'mine')}>{i18n.t('views.diff.keepMine')}</button>
          {#if takeable(held)}<button type="button" aria-pressed={held.pick === 'theirs'} disabled={session.phase !== 'ready'} onclick={() => session.hold(change.path, 'theirs')}>{i18n.t('views.diff.keepTheirs')}</button>{/if}
        </span>
      {:else}
        <p class="about">{merge?.merged ? i18n.t('views.diff.aboutMerged') : about(change)}</p>
      {/if}
      {#if change.side === 'both'}{@render keep(change)}{/if}
    </header>
    {#if merge && merge.merged}
      {@const shown = hunksOf(lineDiff(textOf(session.local.find((f) => f.path === change.path)?.bytes ?? null), linesOf(merge.mine)))}
      <p class="legend"><span>{i18n.t('views.diff.mergedShows')}</span></p>
      {#if shown.hunks.length}<LineDiff hunks={shown.hunks} tail={shown.tail} {gloss} />{:else}<p class="empty">{i18n.t('views.diff.same')}</p>{/if}
    {:else if merge && total > 0}
      <div class="bar" role="toolbar" aria-label={i18n.t('views.diff.conflicts')}>
        <span class="where">{i18n.t('views.diff.conflictOf', { i: current + 1, n: total })}</span>
        <button type="button" class="icon" title={i18n.t('views.diff.prev')} aria-label={i18n.t('views.diff.prev')} onclick={() => goTo(current - 1)}>↑</button>
        <button type="button" class="icon" title={i18n.t('views.diff.next')} aria-label={i18n.t('views.diff.next')} onclick={() => goTo(current + 1)}>↓</button>
        <span class="counts">{i18n.t('views.diff.resolvedOf', { k: settled, n: total })}</span>
        <button type="button" class="link" onclick={() => setDraft(choices, editing ? null : result ?? merge.mine)}>{editing ? i18n.t('views.diff.stopEdit') : i18n.t('views.diff.edit')}</button>
      </div>
      {#if editing}
        <textarea class="edit" spellcheck="false" aria-label={i18n.t('views.diff.result')} value={draft?.edited ?? ''} oninput={(e) => setDraft(choices, e.currentTarget.value)}></textarea>
      {:else}
        <div class="code merge">
          {#each blocks as b, bi (bi)}
            {#if b.kind === 'same'}
              {#if b.lines.length > FOLD && !unfolded.has(bi)}
                {@render lines(bi === 0 ? [] : b.lines.slice(0, KEEP), 'same')}
                <button type="button" class="fold" onclick={() => (unfolded = toggle(unfolded, bi))}>{i18n.t('views.diff.showLines', { n: b.lines.length - (bi === 0 ? KEEP : 2 * KEEP) })}</button>
                {@render lines(b.lines.slice(-KEEP), 'same')}
              {:else}
                {@render lines(b.lines, 'same')}
              {/if}
            {:else}
              {@const i = ordinal[bi]}
              {@const c = choices[i]}
              <div class="conflict" class:current={i === current} class:done={c !== null} bind:this={els[i]}>
                <div class="lens">
                  {#if c === null}
                    <button type="button" onclick={() => choose(i, 'mine')}>{i18n.t('views.diff.acceptMine')}</button><span aria-hidden="true">|</span>
                    <button type="button" onclick={() => choose(i, 'theirs')}>{i18n.t('views.diff.acceptTheirs')}</button><span aria-hidden="true">|</span>
                    <button type="button" onclick={() => choose(i, 'both')}>{i18n.t('views.diff.acceptBoth')}</button><span aria-hidden="true">|</span>
                    <button type="button" aria-pressed={comparing.has(i)} onclick={() => (comparing = toggle(comparing, i))}>{comparing.has(i) ? i18n.t('views.diff.hideCompare') : i18n.t('views.diff.compare')}</button>
                  {:else}
                    <span class="chose">{i18n.t(CHOSE[c])}</span><span aria-hidden="true">|</span>
                    <button type="button" onclick={() => choose(i, null)}>{i18n.t('views.diff.undo')}</button>
                  {/if}
                </div>
                {#if c === null}
                  {#if comparing.has(i)}
                    {@const d = hunksOf(lineDiff(b.mine, b.theirs), 1_000_000)}
                    <LineDiff hunks={d.hunks} tail={d.tail} {gloss} />
                  {:else}
                    <div class="side mine"><span class="tag">{i18n.t('views.diff.device')}</span>{@render lines(b.mine, 'mine')}</div>
                    <div class="side theirs"><span class="tag">{i18n.t('views.diff.repo')}</span>{@render lines(b.theirs, 'theirs')}</div>
                  {/if}
                {:else}
                  <div class="side result">{@render lines(chosenLines(b, c), 'result')}</div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      {/if}
      <footer class="outcome">
        <span class="status" class:bad={problem !== null} role="status">
          {#if result === null}{i18n.t('views.diff.unresolved', { n: total - settled })}
          {:else if problem}{problem}
          {:else if inUse}{i18n.t('views.diff.inUse')}
          {:else}{i18n.t('views.diff.valid')}{/if}
        </span>
        <button type="button" class="go" disabled={result === null || problem !== null || inUse || session.phase !== 'ready'} onclick={() => void use()}>{i18n.t('views.diff.useResult')}</button>
      </footer>
    {:else}
      {#await loading}
        <p class="empty">{i18n.t('views.diff.reading')}</p>
      {:then v}
        {#if v && kind(change.path) === 'text'}
          {@const d = diffOf(change, v)}
          {@const lineCount = d.hunks.reduce((n, h) => n + h.lines.length, 0)}
          <p class="legend"><span class="del">− {s.from}</span><span class="add">+ {s.to}</span><span class="counts">{i18n.t('views.diff.counts', { removed: d.removed, added: d.added })}</span></p>
          {#if !d.hunks.length}
            <p class="empty">{i18n.t('views.diff.same')}</p>
          {:else if lineCount > MAX_LINES}
            <p class="empty">{i18n.t('views.diff.tooMany', { n: lineCount })}</p>
          {:else}
            <LineDiff hunks={d.hunks} tail={d.tail} {gloss} />
          {/if}
        {:else if v}
          {@const image = kind(change.path) === 'image'}
          <div class="pair">
            {@render version(s.pull ? i18n.t('views.diff.device') : i18n.t('views.diff.repo'), s.pull ? v.mine : v.theirs, change.path, image)}
            {@render version(s.pull ? i18n.t('views.diff.repo') : i18n.t('views.diff.device'), s.pull ? v.theirs : v.mine, change.path, image)}
          </div>
        {/if}
      {:catch e}
        <p class="empty bad" role="alert">{e instanceof Error ? e.message : i18n.t('views.diff.failed')}</p>
      {/await}
    {/if}
  {/if}
</div>

<style>
  .diff{font-family:var(--sans);font-size:.88rem;line-height:1.45;padding:16px 8px;display:flex;flex-direction:column;gap:12px;max-width:1100px}
  header{display:flex;flex-direction:column;gap:2px}
  h2{margin:0;font-size:1.15rem;font-weight:600;line-height:1.2}
  .path{margin:0;color:var(--muted);font-family:var(--mono);font-size:.74rem}
  .about{margin:8px 0 0}
  .empty{color:var(--muted);margin:0}
  .bad{color:var(--bad)}
  .choose{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}
  .held{margin:8px -6px 0;font-size:.88rem}
  .choose button{font:inherit;font-size:.82rem;padding:4px 12px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:999px;cursor:pointer}
  .choose button:hover:not(:disabled){background:var(--soft)}
  .choose button:disabled{opacity:.55;cursor:default}
  .choose button[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--panel)}
  .choose button:focus-visible,.lens button:focus-visible,.icon:focus-visible,.link:focus-visible,.go:focus-visible,.fold:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .legend{display:flex;flex-wrap:wrap;gap:4px 16px;margin:0;font-size:.8rem;font-weight:600}
  .legend .del{color:var(--bad)} .legend .add{color:var(--ok)}
  .counts{margin-left:auto;font-weight:400;color:var(--muted);font-variant-numeric:tabular-nums}
  .pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
  figure{margin:0;border:1px solid var(--rule);border-radius:6px;background:var(--panel);padding:12px;display:flex;flex-direction:column;gap:8px}
  figcaption{font-size:.8rem;font-weight:600}
  img{max-width:100%;max-height:60vh;object-fit:contain;align-self:flex-start}
  .none{margin:0;color:var(--muted)}

  /* The merge editor: this device's lines in the green of what stays, the
     repo's in the accent of what arrives, as VS Code paints current and
     incoming; a settled conflict in the plain result. */
  .bar{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);font-size:.8rem}
  .where{font-weight:600;font-variant-numeric:tabular-nums}
  .icon{width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:5px;background:transparent;color:var(--ink);cursor:pointer;font:inherit}
  .icon:hover{background:var(--soft2)}
  .link{border:0;background:transparent;padding:0;font:inherit;font-size:.8rem;color:var(--accent);cursor:pointer}
  .link:hover{text-decoration:underline}
  .code{border:1px solid var(--rule);border-radius:6px;background:var(--panel);font-family:var(--mono);font-size:.76rem;line-height:1.55;overflow:hidden}
  .ln{white-space:pre-wrap;overflow-wrap:anywhere;padding:0 10px 0 14px;min-height:1.55em}
  .ln.same{color:var(--ink)}
  .fold{display:block;width:100%;text-align:left;border:0;padding:2px 14px;background:var(--soft);color:var(--muted);font-family:var(--sans);font-size:.74rem;cursor:pointer}
  .fold:hover{color:var(--ink)}
  .conflict{border-left:3px solid var(--warm);margin:2px 0}
  .conflict.current{box-shadow:inset 0 0 0 1px var(--warm)}
  .conflict.done{border-left-color:var(--muted)}
  .lens{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 6px;padding:2px 14px;font-family:var(--sans);font-size:.72rem;color:var(--muted)}
  .lens button{border:0;background:transparent;padding:0;font:inherit;color:var(--muted);cursor:pointer}
  .lens button:hover{color:var(--accent);text-decoration:underline}
  .lens button[aria-pressed="true"]{color:var(--accent)}
  .chose{color:var(--ink)}
  .side{position:relative}
  .tag{position:absolute;right:8px;top:1px;font-family:var(--sans);font-size:.68rem;color:var(--muted)}
  .side.mine{background:color-mix(in srgb,var(--ok) 14%,transparent)}
  .side.theirs{background:color-mix(in srgb,var(--accent) 14%,transparent)}
  .side.result{background:var(--soft)}
  .side{min-height:1.55em}
  .edit{width:100%;box-sizing:border-box;min-height:50vh;font-family:var(--mono);font-size:.76rem;line-height:1.55;padding:8px 10px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);color:var(--ink);resize:vertical}
  .edit:focus-visible{outline:2px solid var(--accent);outline-offset:-1px}
  .outcome{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
  .status{flex:1;min-width:12em;font-size:.8rem;color:var(--muted)}
  .status.bad{color:var(--bad)}
  .go{font:inherit;font-size:.84rem;font-weight:600;padding:6px 14px;border:0;border-radius:5px;background:var(--ink);color:var(--panel);cursor:pointer}
  .go:hover:not(:disabled){opacity:.86}
  .go:disabled{background:var(--soft2);color:var(--muted);cursor:default}
</style>
