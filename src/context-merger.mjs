// src/context-merger.mjs

/**
 * CRDT LWW-Map (Last-Writer-Wins) for Context Synchronization
 * Ensures mathematical eventual consistency across Edge and Cloud.
 */
export class ContextCRDT {
    /**
     * @param {string} peerId - Unique identifier for the node (e.g., 'edge_mobile_1' or 'cloud_server')
     */
    constructor(peerId) {
        this.peerId = peerId;
        this.logicalClock = 0; // Vector clock / Logical timestamp
        this.state = new Map(); // key: contextId, value: { data, clock, peerId, isDeleted }
    }

    // ⏱️ Increment logical clock on every local mutation
    tick() {
        this.logicalClock += 1;
        return this.logicalClock;
    }

    // ➕ Add or update a context claim
    addOrUpdateClaim(contextId, data) {
        const clock = this.tick();
        this.state.set(contextId, { data, clock, peerId: this.peerId, isDeleted: false });
    }

    // ➖ Remove a context claim (Tombstone)
    removeClaim(contextId) {
        const clock = this.tick();
        this.state.set(contextId, { data: null, clock, peerId: this.peerId, isDeleted: true });
    }

    /**
     * 🔄 Conflict-Free Merging Logic
     * Commutative, Associative, and Idempotent.
     * @param {Map} otherState - The state map from the remote CRDT node
     */
    merge(otherState) {
        for (const [contextId, remoteRecord] of otherState.entries()) {
            const localRecord = this.state.get(contextId);

            // If we don't have it, accept the remote record
            if (!localRecord) {
                this.state.set(contextId, { ...remoteRecord });
                this.logicalClock = Math.max(this.logicalClock, remoteRecord.clock);
                continue;
            }

            // ⚔️ Conflict Resolution Rule:
            // 1. Highest logical clock wins.
            // 2. If clocks are exactly equal, tie-break using peerId (lexicographical sorting).
            if (remoteRecord.clock > localRecord.clock || 
               (remoteRecord.clock === localRecord.clock && remoteRecord.peerId > localRecord.peerId)) {
                this.state.set(contextId, { ...remoteRecord });
            }

            // Sync logical clocks to the highest known time in the system
            this.logicalClock = Math.max(this.logicalClock, remoteRecord.clock);
        }
    }

    // 📊 Get the final resolved graph (filtering out deleted tombstones)
    getResolvedGraph() {
        const graph = [];
        for (const [contextId, record] of this.state.entries()) {
            if (!record.isDeleted) {
                graph.push({ id: contextId, ...record.data });
            }
        }
        return graph; // Sorting can be applied here if deterministic order is needed
    }

    // Export raw state for network transmission
    exportState() {
        return new Map(this.state);
    }
}