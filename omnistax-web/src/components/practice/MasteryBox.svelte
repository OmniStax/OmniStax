<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { DAY, fillOf, type State } from '../../lib/practice/model';
  import { i18n } from '../../lib/i18n/store.svelte';
  import type { MessageKey } from '../../lib/i18n/index';

  let { id, state = 'untouched', share = 0, title = '' }: { id?: string; state?: State; share?: number; title?: string } = $props();

  const STATE_KEY: Readonly<Record<State, MessageKey>> = { untouched: 'practice.state.untouched', practised: 'practice.state.practised', mastered: 'practice.state.mastered' };

  const freshnessTitle = (id: string, now = Date.now()): string => {
    const record = practice.mastery[id];
    if (!record?.mastered) return '';
    const fresh = practice.freshness(id, now);
    if (fresh.permanent) return i18n.t(record.selfAssessed ? 'practice.mastery.overrideNoDecay' : 'practice.mastery.masteredNoDecay');
    const n = Math.ceil(Math.abs(fresh.dueAt - now) / DAY);
    return fresh.due ? (n === 0 ? i18n.t('practice.mastery.dueNow') : i18n.t('practice.mastery.overdue', { n })) : i18n.t('practice.mastery.fresh', { n });
  };

  const boxTitle = (id: string, s: State): string =>
    s === 'untouched' ? i18n.t('practice.mastery.notYet')
      : s === 'mastered' ? freshnessTitle(id)
        : i18n.t('practice.mastery.toward', { level: practice.mastery[id]?.level ?? 0, target: practice.mastery[id]?.target ?? practice.settings.masteryTarget });

  const st = $derived(id ? practice.stateOf(id) : state);
  const sh = $derived(id ? practice.share(id) : share);
  const fresh = $derived(id ? practice.freshness(id) : { value: 1, due: false });
  const tip = $derived(id ? boxTitle(id, st) : title);
</script>

<i class="mbox st-{st}" class:hi={st === 'practised' && sh >= 0.5} class:due={fresh.due}
  style:--fill="{Math.round(fillOf(st, sh) * 100)}%" style:--fresh={fresh.value}
  role="img" aria-label={i18n.t(STATE_KEY[st])} title={tip || undefined}></i>

<style>
  .mbox{position:relative;flex:none;display:block;width:14px;height:14px;box-sizing:border-box;border:1.5px solid var(--rule);border-radius:4px;background:var(--soft);overflow:hidden}
  :global(.view-pane) .mbox{width:16px;height:16px}
  .mbox::after{content:"";position:absolute;left:0;right:0;bottom:0;height:var(--fill,0%);background:transparent}
  .mbox.st-untouched{border-color:transparent;background:color-mix(in srgb,var(--ink) 9%,transparent)}
  .mbox.st-practised{border-color:var(--m-low)}
  .mbox.st-practised::after{background:var(--m-low)}
  .mbox.st-practised.hi{border-color:var(--m-mid)}
  .mbox.st-practised.hi::after{background:var(--m-mid)}
  .mbox.st-mastered{border-color:color-mix(in srgb,var(--m-high) calc(var(--fresh,1) * 100%),var(--warm))}
  .mbox.st-mastered::after{background:var(--m-high)}
  .mbox.st-mastered.due{border-style:dashed}
</style>
