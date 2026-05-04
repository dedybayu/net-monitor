// ============================================================
// DNS Reverse Lookup Cache with TTL
// Prevents flooding the DNS server with repeated lookups
// ============================================================

import dns from 'dns';

interface CacheEntry {
  hostnames: string[];
  timestamp: number;
}

export class DnsCache {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingLookups: Map<string, Promise<string[]>> = new Map();
  private ttlMs: number;
  private maxSize: number;

  constructor(ttlMs: number = 5 * 60 * 1000, maxSize: number = 10000) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  /**
   * Reverse DNS lookup with caching.
   * Returns array of hostnames, or empty array if lookup fails.
   */
  async reverseLookup(ip: string): Promise<string[]> {
    // Check cache first
    const cached = this.cache.get(ip);
    if (cached && (Date.now() - cached.timestamp) < this.ttlMs) {
      return cached.hostnames;
    }

    // Check if there's already a pending lookup for this IP
    const pending = this.pendingLookups.get(ip);
    if (pending) {
      return pending;
    }

    // Perform lookup
    const lookupPromise = this.doLookup(ip);
    this.pendingLookups.set(ip, lookupPromise);

    try {
      const hostnames = await lookupPromise;
      this.setCache(ip, hostnames);
      return hostnames;
    } finally {
      this.pendingLookups.delete(ip);
    }
  }

  private doLookup(ip: string): Promise<string[]> {
    return new Promise((resolve) => {
      dns.reverse(ip, (err, hostnames) => {
        if (err || !hostnames || hostnames.length === 0) {
          resolve([]);
        } else {
          resolve(hostnames);
        }
      });
    });
  }

  private setCache(ip: string, hostnames: string[]): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(ip, { hostnames, timestamp: Date.now() });
  }

  /** Get cache stats */
  getStats(): { size: number; maxSize: number; pendingLookups: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      pendingLookups: this.pendingLookups.size,
    };
  }

  /** Clear the cache */
  clear(): void {
    this.cache.clear();
    this.pendingLookups.clear();
  }
}
