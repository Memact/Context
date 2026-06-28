import assert from 'assert';
import { MemoryStore } from '../src/memory-store.mjs';

describe('Memory TTL and Pruning', () => {
  it('should expire memory after TTL', (done) => {
    const store = new MemoryStore();
    store.save('temp-item', { val: 'test' }, 50); // 50ms TTL

    setTimeout(() => {
      const val = store.get('temp-item');
      assert.strictEqual(val, null);
      done();
    }, 100);
  });

  it('should prune all expired entries', () => {
    const store = new MemoryStore();
    store.save('a', { val: 1 }, 1);
    store.save('b', { val: 2 }, 10000);
    
    store.prune();
    assert.strictEqual(store.get('a'), null);
    assert.strictEqual(store.get('b').val, 2);
  });
});