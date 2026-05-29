interface CacheEntry<T> {
  data: T
  timestamp: number
}

export class ClientCache {
  private static memoryCache = new Map<string, CacheEntry<any>>()

  /**
   * Retrieves an item from the cache (in-memory first, fallback to localStorage).
   */
  static get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null

    // Check memory first
    const memory = this.memoryCache.get(key)
    if (memory) return memory.data

    // Fall back to localStorage
    try {
      const item = localStorage.getItem(`cv_cache_${key}`)
      if (item) {
        const parsed = JSON.parse(item) as CacheEntry<T>
        this.memoryCache.set(key, parsed)
        return parsed.data
      }
    } catch (err) {
      console.error('[ClientCache] Read error for key:', key, err)
    }
    return null
  }

  /**
   * Stores an item in the cache (both in-memory and localStorage).
   */
  static set<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    }
    this.memoryCache.set(key, entry)

    try {
      localStorage.setItem(`cv_cache_${key}`, JSON.stringify(entry))
    } catch (err) {
      console.error('[ClientCache] Write error for key:', key, err)
    }
  }

  /**
   * Checks if a cache entry is stale based on the specified staleTime window.
   */
  static isStale(key: string, staleTimeMs: number = 60 * 1000): boolean {
    if (typeof window === 'undefined') return true
    
    // Attempt to load into memory if missing
    const entry = this.memoryCache.get(key)
    if (!entry) {
      this.get(key)
      const reloaded = this.memoryCache.get(key)
      if (!reloaded) return true
      return Date.now() - reloaded.timestamp > staleTimeMs
    }
    
    return Date.now() - entry.timestamp > staleTimeMs
  }

  /**
   * Invalidates a cache key.
   */
  static invalidate(key: string): void {
    this.memoryCache.delete(key)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cv_cache_${key}`)
      } catch (err) {
        console.error('[ClientCache] Invalidate error for key:', key, err)
      }
    }
  }
}
