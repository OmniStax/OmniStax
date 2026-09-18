export const registerOfflineWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return null;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return null;
  try { return await navigator.serviceWorker.register('/sw.js', { scope: '/' }); } catch { return null; }
};

