<script lang="ts">
  /* Colour coding, dark mode, animations, reset layout. Saved in this browser. */
  import { settings } from '../lib/settings/store.svelte';
  import { layoutStore } from '../lib/layout/store.svelte';
  let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

{#if open}
  <div class="popover" id="settings" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1" aria-label="Settings">
    <div class="eyebrow">Settings</div>
    <label class="switch"><input type="checkbox" id="cc-toggle" checked={settings.colorCoding} onchange={(e) => settings.setColorCoding(e.currentTarget.checked)}> Color coding</label>
    <label class="switch theme"><input type="checkbox" id="theme-toggle" checked={settings.dark} onchange={(e) => settings.setDark(e.currentTarget.checked)}> Dark mode</label>
    <label class="switch"><input type="checkbox" id="anim-toggle" checked={settings.animations} onchange={(e) => settings.setAnimations(e.currentTarget.checked)}> Play animations</label>
    <button class="btn-sm" id="reset-layout" type="button" onclick={() => layoutStore.reset()}>Reset layout</button>
    <small>Layout and settings are saved in this browser.</small>
  </div>
{/if}

<style>
  .popover{position:fixed;left:52px;bottom:12px;z-index:40;background:var(--panel);border:1px solid var(--rule);border-radius:8px;padding:14px 16px;font-family:var(--sans);font-size:0.86rem;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);min-width:230px}
  .popover .eyebrow{margin-bottom:-4px}
  .btn-sm{font:inherit;font-size:0.82rem;padding:5px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:4px;cursor:pointer;align-self:flex-start}
  .btn-sm:hover{background:var(--soft)}
  small{color:var(--muted);font-size:0.75rem}
  .switch{display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;user-select:none}
  .switch input{appearance:none;width:38px;height:22px;border-radius:11px;background:var(--soft2);position:relative;cursor:pointer;margin:0;transition:background .15s}
  .switch input::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--panel);box-shadow:0 1px 2px rgba(0,0,0,.3);transition:left .15s}
  .switch input:checked{background:var(--accent)}
  .switch input:checked::after{left:19px}
  .switch input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .switch.theme input:checked{background:var(--ink)}
  .switch.theme input:checked::after{background:var(--bg)}
</style>
