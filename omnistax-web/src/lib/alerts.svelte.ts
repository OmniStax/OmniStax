/* One alert at a time, at the bottom right where the tip stands: a sentence
   and, where there is one, the thing to do about it. The shell draws it;
   anything may raise one; the reader closes it or takes the action. */
export type Alert = { readonly text: string; readonly action?: { readonly label: string; readonly run: () => void } };

class Alerts {
  current = $state.raw<Alert | null>(null);
  show(a: Alert): void { this.current = a; }
  close(): void { this.current = null; }
}
export const alerts = new Alerts();
