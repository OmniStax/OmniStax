<script lang="ts">
  import { onMount, mount } from 'svelte';
  import type { ItemId } from '../lib/types/ids';
  import { hasInterruptedRestore, recoverInterruptedRestore } from '../lib/backup/journal';
  import { startReaderLifetimeLock } from '../lib/backup/guard';

  type Props = { own: ItemId; threeUrl?: string };
  let props: Props = $props();
  let host: HTMLElement;
  let failed = $state(false);

  onMount(() => {
    let stopLock: () => Promise<void> = async () => undefined;
    let component: ReturnType<typeof mount> | undefined;
    const start = async () => { const { default: Shell } = await import('./Shell.svelte'); component = mount(Shell, { target: host, props }); };
    const bootstrap = async () => {
      /* Inspect the journal only while this tab holds the same shared lock that
         protects initialized stores. If recovery is needed, release it, recover
         under the exclusive lock, then reacquire and verify before importing
         Shell (whose modules contain eager localStorage readers). */
      stopLock = await startReaderLifetimeLock();
      if (await hasInterruptedRestore()) {
        await stopLock();
        await recoverInterruptedRestore();
        stopLock = await startReaderLifetimeLock();
        if (await hasInterruptedRestore()) throw new Error('reader restore recovery did not commit');
      }
      await start();
    };
    void bootstrap().catch(() => { failed = true; });
    return () => { void stopLock(); if (component) void import('svelte').then(({ unmount }) => unmount(component!)); };
  });
</script>

<div bind:this={host}></div>
{#if failed}<p class="failed" role="alert">OmniStax could not safely recover reader data. Reload the page or import a backup.</p>{/if}

<style>.failed{margin:24px;font-family:system-ui,sans-serif;color:#b42318}</style>
