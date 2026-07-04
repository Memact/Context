/**
 * Core Memory Store with TTL support
 */
export class MemoryStore {
  constructor() {
    this.store = new Map();
  }

  // Add memory with optional TTL (time in milliseconds)
  save(id, data, ttlMs = null) {
    const now = Date.now();
    const memoryEntry = {
      data,
      createdAt: now,
      expiresAt: ttlMs ? now + ttlMs : null,
      lastReinforcedAt: now
    };
    this.store.set(id, memoryEntry);
  }

  // Retrieve only if not expired
  get(id) {
    const entry = this.store.get(id);
    if (!entry) return null;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(id);
      return null;
    }
    return entry.data;
  }

  // Pruning service to clean up expired memories
  prune() {
    const now = Date.now();
    for (const [id, entry] of this.store.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.store.delete(id);
      }
    }
  }
}