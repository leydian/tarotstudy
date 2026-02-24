export class TTLCache {
  constructor(ttlSeconds = 3600, maxSize = 1000) {
    this.ttlMs = ttlSeconds * 1000;
    this.maxSize = maxSize;
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Refresh position for LRU
    this.store.delete(key);
    this.store.set(key, item);
    return item.value;
  }

  set(key, value) {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }
}
