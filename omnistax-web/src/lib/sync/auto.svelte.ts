/* Pushing on a timer. Every half minute the clock looks: when the reader asked
   for a push every so many minutes, that long has passed since the last one,
   nothing is being synced, and the reader has been quiet for a while (the
   strokes of a drawing and the keys of a note come too fast to push on), the
   repo is read and this device's changes go up, all of them in one push. A
   conflict is left for the Sync view. A push that fails raises an alert once,
   with the way to the Sync view, unless that view is already open; the next
   try waits a whole interval. */
import { sync } from './store.svelte';
import { session } from './session.svelte';
import { alerts } from '../alerts.svelte';
import { layoutStore } from '../layout/store.svelte';
import { commands } from '../commands/registry.svelte';
import { showViewId } from '../commands/builtin';

export const QUIET_MS = 30_000;
const TICK_MS = 30_000;
let lastInput = Date.now();
let lastTry = 0;
let running = false;

const syncOpen = (): boolean => { const l = layoutStore.layout; return l.sides.left.items.includes('view:sync') || l.sides.right.items.includes('view:sync') || l.groups.some((g) => g.tabs.some((t) => t === 'view:sync' || t.startsWith('view:sync@'))); };

export const tick = async (now = Date.now()): Promise<void> => {
  const every = sync.every;
  if (!every || !sync.remote || running || session.phase === 'moving' || session.phase === 'reading') return;
  if (now - lastInput < QUIET_MS) return;
  const since = Math.max(sync.last?.at ?? 0, lastTry);
  if (now - since < every * 60_000) return;
  running = true; lastTry = now;
  try {
    await session.read();
    if (session.phase !== 'ready') throw new Error(session.problem || 'Could not read the repo.');
    const up = session.plan.up;
    if (!up.length) return;
    await session.go({ up, down: [] });
    if (session.problem) throw new Error(session.problem);
  } catch (e) {
    if (!syncOpen()) alerts.show({ text: `Error pushing: ${e instanceof Error ? e.message : String(e)}`, action: { label: 'Open Sync view', run: () => { commands.run(showViewId('sync')); } } });
  } finally { running = false; }
};

export const startAutoPush = (): (() => void) => {
  const touched = (): void => { lastInput = Date.now(); };
  window.addEventListener('pointerdown', touched, true); window.addEventListener('keydown', touched, true); window.addEventListener('input', touched, true);
  const timer = setInterval(() => { void tick(); }, TICK_MS);
  return () => { clearInterval(timer); window.removeEventListener('pointerdown', touched, true); window.removeEventListener('keydown', touched, true); window.removeEventListener('input', touched, true); };
};
