export const registerOfflineWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return null;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return null;
  try { const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' }); await navigator.serviceWorker.ready; return registration; } catch { return null; }
};

export type WorkerPin = { readonly bookId: string; readonly release: string; readonly artifact: string };
const askWorker = <T>(type: string): Promise<T | null> => new Promise((resolve) => {
  const worker = navigator.serviceWorker?.controller; if (!worker) { resolve(null); return; }
  const channel = new MessageChannel(); const timeout = window.setTimeout(() => resolve(null), 1500);
  channel.port1.onmessage = (event) => { window.clearTimeout(timeout); resolve(event.data as T); };
  worker.postMessage({ type }, [channel.port2]);
});

export const currentWorkerPin = (): Promise<WorkerPin | null> => askWorker<WorkerPin>('omnistax:current-pin');
export const liveWorkerPins = (): Promise<readonly WorkerPin[] | null> => askWorker<readonly WorkerPin[]>('omnistax:live-pins');
