/* A command is a named action the palette lists and a chord can trigger.
   A command with `choices` opens a list in the palette instead of running.
   Pure types only, so tests and the builtin factory need no Svelte runtime. */
import type { ChoiceList } from './choice';

export type CommandId = string & { readonly __brand: 'CommandId' };
export type CommandGroup = string;
export type Command = {
  readonly id: CommandId;
  readonly label: string;
  readonly group: CommandGroup;
  readonly run: () => void;
  readonly when?: () => boolean;      /* absent: always available */
  readonly detail?: () => string;     /* a short live note shown after the label, e.g. the current value */
  readonly choices?: () => ChoiceList;
};
export const commandId = (s: string): CommandId => s as CommandId;
export const available = (c: Command): boolean => (c.when ? c.when() : true);
