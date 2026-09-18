const FLAG = '__omnistaxReaderWritesAllowed';
const LOCK = 'omnistax-reader-profile';
type GuardedGlobal = typeof globalThis & { [FLAG]?: boolean };

export const readerWritesAllowed = (): boolean => (globalThis as GuardedGlobal)[FLAG] !== false;
export const setReaderWritesAllowed = (allowed: boolean): void => { (globalThis as GuardedGlobal)[FLAG] = allowed; };

let releaseShared: (() => void) | null = null;
let sharedRequest: Promise<void> | null = null;

/* Every initialized shell holds a shared Web Lock for its lifetime. A restore
   can obtain the exclusive lock only when no other tab has live stores capable
   of writing stale state. Frozen tabs retain their lock. */
export const startReaderLifetimeLock = async (): Promise<() => Promise<void>> => {
  if (!navigator.locks) return async () => undefined;
  let acquired!: () => void;
  const ready = new Promise<void>((resolve) => { acquired = resolve; });
  const held = new Promise<void>((resolve) => { releaseShared = resolve; });
  sharedRequest = Promise.resolve(navigator.locks.request(LOCK, { mode: 'shared' }, async () => { acquired(); await held; }));
  await ready;
  return async () => {
    releaseShared?.(); releaseShared = null;
    await sharedRequest; sharedRequest = null;
  };
};

export const withExclusiveReaderLock = async <T>(operation: () => Promise<T>, releaseThisTab: boolean): Promise<T> => {
  if (!navigator.locks) throw new Error('Safe restore needs the Web Locks API, which this browser does not provide. Export still works; use a current browser to import.');
  if (releaseThisTab) {
    /* No store may write in the interval between dropping this tab's shared
       lifetime lock and either obtaining exclusivity or forcing a reload. */
    setReaderWritesAllowed(false);
    releaseShared?.(); releaseShared = null;
    await sharedRequest; sharedRequest = null;
  }
  return navigator.locks.request(LOCK, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
    if (!lock) throw new Error('Close OmniStax in other tabs or windows, then try the import again.');
    setReaderWritesAllowed(false);
    return operation();
  });
};
