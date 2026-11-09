/* A grow function run off the page: the network and storage taken away, then
   the function called once with its seeded rand. One message in, one out. */
import { evaluate, type GrowAsk, type GrowReply } from './grow';

const scope = self as unknown as Record<string, unknown>;
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'indexedDB', 'caches', 'importScripts', 'BroadcastChannel']) {
  try { scope[name] = undefined; } catch { /* not writable here */ }
}

self.onmessage = (e: MessageEvent<GrowAsk>) => {
  const { src, n } = e.data;
  const reply: GrowReply = evaluate(src, n, (body, rand) => new Function('rand', body)(rand));
  (self as unknown as Worker).postMessage(reply);
};
