/**
 * Generates a SHA256 hash of the input string for caching keys
 */
async function generateCacheKey(text: string): Promise<string> {
  // Use Web Crypto API for browser compatibility
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Cache entry for a prompt response
 */
interface CacheEntry {
  key: string;
  timestamp: number;
  tokens: string[];
  metadata?: Record<string, any>;
  done: boolean;
}

/**
 * Simple prompt cache using IndexedDB with fallback to sessionStorage
 */
class PromptCache {
  private static instance: PromptCache;
  private db: IDBDatabase | null = null;
  private useIndexedDB = false;
  private sessionCache: Map<string, CacheEntry> = new Map();
  private readonly MAX_CACHE_SIZE = 100; // Max items in cache
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.initDB();
  }

  static getInstance(): PromptCache {
    if (!PromptCache.instance) {
      PromptCache.instance = new PromptCache();
    }
    return PromptCache.instance;
  }

  private async initDB(): Promise<void> {
    try {
      const request = indexedDB.open('MathAI', 1);

      request.onerror = () => {
        console.warn('IndexedDB not available, using session cache');
        this.useIndexedDB = false;
      };

      request.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        this.useIndexedDB = true;
      };

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('promptCache')) {
          db.createObjectStore('promptCache', { keyPath: 'key' });
        }
      };
    } catch (err) {
      console.warn('IndexedDB init failed:', err);
      this.useIndexedDB = false;
    }
  }

  /**
   * Get cached response tokens for a prompt
   */
  async get(prompt: string): Promise<CacheEntry | null> {
    const key = await generateCacheKey(prompt);

    // Try session cache first (faster)
    const cached = this.sessionCache.get(key);
    if (cached && !this.isExpired(cached)) {
      return cached;
    }

    // Try IndexedDB if available
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction(['promptCache'], 'readonly');
        const store = transaction.objectStore('promptCache');
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (result && !this.isExpired(result)) {
            resolve(result);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    }

    return null;
  }

  /**
   * Cache response tokens for a prompt
   */
  async set(prompt: string, tokens: string[], metadata?: Record<string, any>): Promise<void> {
    const key = await generateCacheKey(prompt);
    const entry: CacheEntry = {
      key,
      timestamp: Date.now(),
      tokens,
      metadata,
      done: true,
    };

    // Add to session cache
    if (this.sessionCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const first = this.sessionCache.entries().next();
      if (!first.done) {
        this.sessionCache.delete(first.value[0]);
      }
    }
    this.sessionCache.set(key, entry);

    // Also add to IndexedDB if available
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction(['promptCache'], 'readwrite');
        const store = transaction.objectStore('promptCache');
        const request = store.put(entry);

        request.onerror = () => console.warn('Failed to cache to IndexedDB');
        request.onsuccess = () => resolve();
      });
    }
  }

  /**
   * Clear all cached items
   */
  async clear(): Promise<void> {
    this.sessionCache.clear();

    if (this.useIndexedDB && this.db) {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction(['promptCache'], 'readwrite');
        const store = transaction.objectStore('promptCache');
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.CACHE_EXPIRY;
  }
}

export { PromptCache, generateCacheKey };
export type { CacheEntry };
