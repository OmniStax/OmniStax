/* The command registry: every action the palette can list and a chord can run.

   Extension point. Any module may add commands at any time:

     import { commands } from '$lib/commands/registry.svelte';
     import { commandId } from '$lib/commands/command';
     commands.register([
       { id: commandId('fold-all'), label: 'Fold all headings', group: 'Reading', run: () => ... },
       { id: commandId('unfold-all'), label: 'Unfold all headings', group: 'Reading', run: () => ... },
       { id: commandId('hide-figures'), label: 'Hide all figures', group: 'Reading', run: () => ... },
       { id: commandId('show-figures'), label: 'Show all figures', group: 'Reading', run: () => ... },
     ]);

   Registering an id again replaces the earlier command; `when` hides a command
   from the palette and from chords while it returns false; `detail` is a short
   live note ("dark", "one at a time") shown beside the label. A default chord
   for a new command goes in DEFAULT_PAIRS (defaults.ts). The list is
   reactive, so the palette and the shortcuts table pick up late registrations. */
import { type Command, type CommandId, available } from './command';
export type { Command, CommandId, CommandGroup } from './command';
export { commandId } from './command';

class CommandRegistry {
  private byId = $state.raw<ReadonlyMap<CommandId, Command>>(new Map());

  register(cmds: readonly Command[]): () => void {
    const next = new Map(this.byId); cmds.forEach((c) => next.set(c.id, c)); this.byId = next;
    return () => this.unregister(cmds.map((c) => c.id));
  }
  unregister(ids: readonly CommandId[]): void { const next = new Map(this.byId); ids.forEach((id) => next.delete(id)); this.byId = next; }
  all(): readonly Command[] { return Array.from(this.byId.values()); }
  get(id: CommandId): Command | undefined { return this.byId.get(id); }
  /* Run a command by id; false when it is unknown or not available right now. */
  run(id: CommandId): boolean { const c = this.byId.get(id); if (!c || !available(c)) return false; c.run(); return true; }
}
export const commands = new CommandRegistry();
