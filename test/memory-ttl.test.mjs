import { describe, it } from 'node:test';
import assert from 'assert';
import { MemoryStore } from '../src/memory-store.mjs';

describe('Memory TTL and Pruning', () => {
  it('should expire memory after TTL', () => {
    const store = new MemoryStore();
    store.save('temp-item', { val: 'test' }, 50); // 50ms TTL

    return new Promise((resolve) => {
      setTimeout(() => {
        const val = store.get('temp-item');
        assert.strictEqual(val, null);
        resolve();
      }, 100);
    });
  });

  it('should prune all expired entries', () => {
    const store = new MemoryStore();
    store.save('a', { val: 1 }, -10);
    store.save('b', { val: 2 }, 10000);
    
    store.prune();
    assert.strictEqual(store.get('a'), null);
    assert.strictEqual(store.get('b').val, 2);
  });
});