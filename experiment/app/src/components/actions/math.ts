/* Render $…$ inside this node once it is in the DOM, and again when its content changes. */
import { FIG } from '../../lib/fig/figlib';
export function math(node: HTMLElement, _dep?: unknown) {
  FIG.renderMath(node);
  return { update() { FIG.renderMath(node); } };
}
