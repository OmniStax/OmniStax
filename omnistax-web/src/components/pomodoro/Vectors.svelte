<script lang="ts">
  /* Segments drift on a noise field when idle and settle into a ring that turns once a minute while running. Off when hidden or motion is reduced. */
  import { settings } from '../../lib/settings/store.svelte';
  let { running = false }: { running?: boolean } = $props();

  const N = 60;
  type Seg = { x: number; y: number; a: number; len: number; ring: number; phase: number };
  /* A cheap smooth field: three sines crossed, which wanders like noise at this size. */
  const field = (x: number, y: number, t: number): number =>
    Math.sin(x * 2.1 + t) + Math.sin(y * 1.7 - t * 0.8) + Math.sin((x + y) * 1.3 + t * 0.5);

  let canvas = $state<HTMLCanvasElement | null>(null);
  /* The loop reads a plain mirror of the prop rather than the prop itself, so
     starting a session bends the motion it is in the middle of instead of
     tearing the canvas down and scattering the segments afresh. */
  let live = false;
  $effect(() => { live = running; });
  const still = $derived(!settings.animations || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches));

  $effect(() => {
    const el = canvas;
    if (!el || still) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const segs: Seg[] = Array.from({ length: N }, (_, i) => ({
      x: Math.random(), y: Math.random(), a: Math.random() * Math.PI * 2,
      len: 6 + Math.random() * 10, ring: 0.62 + (i % 5) * 0.06, phase: (i / N) * Math.PI * 2,
    }));
    let frame = 0;
    const t0 = performance.now();
    const draw = (ms: number): void => {
      frame = requestAnimationFrame(draw);
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h || document.visibilityState === 'hidden') return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t = (ms - t0) / 1000;
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
      /* The stroke is the canvas's own colour, which the stylesheet swaps when a session runs. */
      ctx.lineCap = 'round';
      ctx.strokeStyle = getComputedStyle(el).color;
      ctx.globalAlpha = live ? 0.55 : 0.3;
      ctx.lineWidth = 1.6;
      for (const s of segs) {
        /* Where this segment wants to be, and which way it wants to point:
           adrift on the field, or seated on the ring and tangent to it. */
        const spin = t * (Math.PI / 30);
        const want = live
          ? { x: 0.5 + Math.cos(s.phase + spin) * s.ring * 0.5, y: 0.5 + Math.sin(s.phase + spin) * s.ring * 0.5, a: s.phase + spin + Math.PI / 2 }
          : { x: s.x + Math.cos(s.a) * 0.004, y: s.y + Math.sin(s.a) * 0.004, a: field(s.x, s.y, t * 0.25) };
        const ease = live ? 0.045 : 1;
        s.x += (want.x - s.x) * ease;
        s.y += (want.y - s.y) * ease;
        /* Turn the short way round, so a segment never spins a whole turn to settle. */
        const d = Math.atan2(Math.sin(want.a - s.a), Math.cos(want.a - s.a));
        s.a += d * (live ? 0.06 : 0.05);
        if (!live) { s.x = (s.x + 1) % 1; s.y = (s.y + 1) % 1; }
        const px = cx + (s.x - 0.5) * 2 * r, py = cy + (s.y - 0.5) * 2 * r;
        const dx = Math.cos(s.a) * s.len / 2, dy = Math.sin(s.a) * s.len / 2;
        ctx.beginPath(); ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx, py + dy); ctx.stroke();
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  });
</script>

<canvas bind:this={canvas} class="vectors" class:on={running} aria-hidden="true"></canvas>

<style>
  .vectors{position:absolute;inset:0;width:100%;height:100%;color:var(--muted)}
  .vectors.on{color:var(--accent)}
</style>
