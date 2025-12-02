/**
 * Simple in-memory cache for Meta API responses
 * Helps reduce rate limiting by caching responses for a short duration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class MetaApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  
  // Default TTL: 2 minutes (120000ms)
  private defaultTTL = 120000;
  
  // Maximum cache entries to prevent memory issues
  private maxEntries = 100;

  /**
   * Get a cached value
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set a cached value
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (default: 2 minutes)
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    // Clean up old entries if we're at capacity
    if (this.cache.size >= this.maxEntries) {
      this.cleanExpired();
      
      // If still at capacity, remove oldest entry
      if (this.cache.size >= this.maxEntries) {
        const oldestKey = this.findOldestEntry();
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Delete a cached value
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Find the oldest cache entry
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  /**
   * Generate a cache key for insights requests
   * @param accountId - Ad account ID
   * @param options - Request options
   */
  static generateInsightsKey(
    accountId: string,
    options: {
      date_preset?: string;
      time_range?: { since: string; until: string };
      level?: string;
      breakdowns?: string[];
    }
  ): string {
    const parts = [
      "insights",
      accountId,
      options.date_preset || "",
      options.time_range ? `${options.time_range.since}-${options.time_range.until}` : "",
      options.level || "",
      options.breakdowns?.join(",") || "",
    ];
    return parts.join(":");
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxEntries: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }
}

// Export singleton instance
export const metaApiCache = new MetaApiCache();

// Export cache TTL constants
export const CACHE_TTL = {
  SHORT: 60000,     // 1 minute - for frequently changing data
  MEDIUM: 120000,   // 2 minutes - default
  LONG: 300000,     // 5 minutes - for stable data
  VERY_LONG: 600000, // 10 minutes - for mostly static data
} as const;

