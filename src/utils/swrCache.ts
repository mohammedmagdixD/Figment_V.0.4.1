/**
 * @license
 * SWR LocalStorage Cache Provider
 * 
 * Provides synchronous hydration of the SWR cache on cold boot.
 * - Reads from localStorage synchronously to ensure instant 0ms paints.
 * - Saves keys individually to prevent QuotaExceededError and avoid main thread blocking.
 * - Synchronizes state across multiple browser tabs natively.
 */

export function swrLocalStorageProvider() {
  const map = new Map<string, any>();
  const PREFIX = 'figment_swr_';

  // Defensive check for edge/SSR environments
  if (typeof window !== 'undefined') {
    
    // 1. Synchronous Cache Hydration on Cold Boot
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) {
          const originalKey = key.slice(PREFIX.length);
          const valueStr = localStorage.getItem(key);
          if (valueStr) {
            map.set(originalKey, JSON.parse(valueStr));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to parse SWR cache from localStorage', err);
    }

    const clearSwrCacheFromStorage = () => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        // Explicitly protect Supabase auth keys
        if (key.startsWith('sb-')) {
          continue;
        }

        if (key.startsWith(PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    };

    // 2. Map Operations Hooking to trigger saves
    const setOp = map.set.bind(map);
    map.set = (key: string, value: any) => {
      setOp(key, value);
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (err) {
        if ((err as any).name === 'QuotaExceededError') {
          console.warn('SWR Cache quota exceeded - clearing cache manually');
          // Clear only SWR keys, strictly ignore 'sb-' auth keys
          clearSwrCacheFromStorage();
          map.clear();
        } else {
          console.warn('Failed to persist SWR cache to localStorage', err);
        }
      }
      return map;
    };

    const deleteOp = map.delete.bind(map);
    map.delete = (key: string) => {
      const result = deleteOp(key);
      try {
        localStorage.removeItem(PREFIX + key);
      } catch (e) {
        // Ignore
      }
      return result;
    };

    const clearOp = map.clear.bind(map);
    map.clear = () => {
      clearOp();
      try {
        clearSwrCacheFromStorage();
      } catch (e) {
        // Ignore
      }
    };

    // 3. Cross-tab Multitasking Synchronization
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith(PREFIX)) {
        const originalKey = e.key.slice(PREFIX.length);
        if (e.newValue === null) {
          deleteOp(originalKey);
        } else {
          try {
            setOp(originalKey, JSON.parse(e.newValue));
          } catch (err) {
            console.warn('Cross-tab sync parse failed', err);
          }
        }
      }
    });
  }

  return map;
}
