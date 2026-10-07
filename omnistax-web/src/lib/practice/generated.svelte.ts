/* The generated exercises, live: read once at boot, added to as a round is
   prepared, and deleted from the curriculum tree and a session's plan. */
import type { ExerciseDTO } from '../content/schema';
import { deleteGenerated, exportGenerated, putGenerated } from './generated-db';
import { exerciseOf, generatedIdOf, type GeneratedExercise } from './generated';

class Generated {
  list = $state.raw<readonly GeneratedExercise[]>([]);
  private byId = $derived(new Map(this.list.map((g) => [g.id as string, g] as const)));

  ready = $state(false);

  async load(): Promise<void> { this.list = await exportGenerated(); this.ready = true; }

  get(ex: string): GeneratedExercise | undefined { return this.byId.get(generatedIdOf(ex)); }
  exercise(ex: string): ExerciseDTO | undefined { const g = this.get(ex); return g ? exerciseOf(g) : undefined; }
  forConcept(id: string): readonly GeneratedExercise[] { return this.list.filter((g) => g.concepts.includes(id)); }
  counts(): Readonly<Record<string, number>> {
    const out: Record<string, number> = {};
    this.list.forEach((g) => new Set(g.concepts).forEach((id) => { out[id] = (out[id] ?? 0) + 1; }));
    return out;
  }

  add(list: readonly GeneratedExercise[]): void { if (list.length) { this.list = [...this.list, ...list]; void putGenerated(list); } }
  /* Drawn into a round: each one used once more, so the next round reaches for others first. */
  use(ids: readonly string[]): void {
    const used = new Set(ids);
    const changed = this.list.filter((g) => used.has(g.id)).map((g) => ({ ...g, uses: g.uses + 1 }));
    if (!changed.length) return;
    const next = new Map(changed.map((g) => [g.id as string, g] as const));
    this.list = this.list.map((g) => next.get(g.id) ?? g);
    void putGenerated(changed);
  }
  remove(id: string): void { this.list = this.list.filter((g) => g.id !== id); void deleteGenerated(id); }
}
export const generated = new Generated();
