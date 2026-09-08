/* A command is a named action the palette lists and a chord can trigger.
   Pure types only, so tests and the builtin factory need no Svelte runtime. */
export type CommandId = string & { readonly __brand: 'CommandId' };
export type CommandGroup = string;
export type Command = {
  readonly id: CommandId;
  readonly label: string;
  readonly group: CommandGroup;
  readonly run: () => void;
  readonly when?: () => boolean;      /* absent: always available */
  readonly detail?: () => string;     /* a short live note shown after the label, e.g. the current value */
};
export const commandId = (s: string): CommandId => s as CommandId;
export const available = (c: Command): boolean => (c.when ? c.when() : true);
