/* Where each place takes its panes in: a group's body under its tab strip, by
   the group's key, and the sidebar's stack. The panes are drawn once, in one list of the shell's, and each
   is put into the body of the group that shows it; a group that is drawn
   again (it became one side of a split) hands over a new body and its panes
   follow. */
class PaneHosts {
  hosts = $state.raw<Readonly<Record<string, HTMLElement>>>({});
  of(group: string): HTMLElement | null { return this.hosts[group] ?? null; }
  set(group: string, el: HTMLElement): void { if (this.hosts[group] !== el) this.hosts = { ...this.hosts, [group]: el }; }
  drop(group: string, el: HTMLElement): void { if (this.hosts[group] === el) { const { [group]: _gone, ...rest } = this.hosts; this.hosts = rest; } }
}
export const paneHosts = new PaneHosts();

/* A group's body, offered to the panes for as long as it stands. */
export function hostsPanes(node: HTMLElement, group: string) {
  let key = group;
  paneHosts.set(key, node);
  return {
    update(next: string) { if (next === key) return; paneHosts.drop(key, node); key = next; paneHosts.set(key, node); },
    destroy() { paneHosts.drop(key, node); },
  };
}

/* A pane, put into its group's body and moved when the body changes. The move
   keeps the element, so everything in it lives on; where the browser can move
   a node without taking it out of the page (`moveBefore`) it does, and frames,
   focus and running animations survive too. A scroller taken out of the page
   forgets how far it was scrolled, so the place is kept here and put back,
   at once where the pane is showing and when it next shows where it is not. */
type Movable = HTMLElement & { moveBefore?: (node: Node, before: Node | null) => void };
export function lodge(node: HTMLElement, host: HTMLElement | null) {
  let top = 0, owed = false;
  const onscroll = (): void => { if (!owed) top = node.scrollTop; };
  node.addEventListener('scroll', onscroll, { passive: true });
  const settle = (): void => {
    if (!owed || !node.isConnected || node.hidden) return;
    owed = false;
    if (Math.abs(node.scrollTop - top) >= 1) node.scrollTo({ top, behavior: 'instant' });
  };
  const place = (to: HTMLElement | null): void => {
    if (to && node.parentElement !== to) {
      owed = top > 0;
      const into = to as Movable;
      try { if (into.moveBefore && node.isConnected && to.isConnected) into.moveBefore(node, null); else to.appendChild(node); }
      catch { to.appendChild(node); }
    }
    settle();
  };
  place(host);
  /* a pane that was hidden when it moved is scrolled back when it is next shown */
  const shown = new MutationObserver(settle);
  shown.observe(node, { attributes: true, attributeFilter: ['hidden'] });
  return { update: place, destroy: () => { node.removeEventListener('scroll', onscroll); shown.disconnect(); } };
}
